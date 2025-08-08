// 전역 변수
let currentUser = null;
let students = [];
let schedules = [];
let records = [];
let grades = [];
let teachers = [
    { id: 'teacher1', name: '김선생', password: '1234' },
    { id: 'teacher2', name: '이선생', password: '1234' }
];

// 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    initializeEventListeners();
    updateDashboard();
});

// 데이터 로드
async function loadAllData() {
    try {
        students = await getData('students');
        schedules = await getData('schedules');
        records = await getData('records');
        grades = await getData('grades');
        teachers = await getData('teachers');
        
        // 기본 선생님 데이터가 없으면 생성
        if (teachers.length === 0) {
            teachers = [
                { id: 'teacher1', name: '김선생', password: '1234' },
                { id: 'teacher2', name: '이선생', password: '1234' }
            ];
            await syncData('teachers', teachers);
        }
    } catch (error) {
        console.error('데이터 로드 실패:', error);
    }
}

// 이벤트 리스너 초기화
function initializeEventListeners() {
    // 폼 제출 이벤트
    document.getElementById('studentForm').addEventListener('submit', handleStudentSubmit);
    document.getElementById('scheduleForm').addEventListener('submit', handleScheduleSubmit);
    document.getElementById('recordForm').addEventListener('submit', handleRecordSubmit);
    document.getElementById('gradeForm').addEventListener('submit', handleGradeSubmit);
    
    // 모달 외부 클릭 시 닫기
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
}

// 로그인 처리
function login() {
    const teacherId = document.getElementById('teacherId').value;
    const password = document.getElementById('teacherPassword').value;
    
    if (!teacherId || !password) {
        showAlert('선생님 ID와 비밀번호를 입력해주세요.', 'error');
        return;
    }
    
    const teacher = teachers.find(t => t.id === teacherId && t.password === password);
    
    if (teacher) {
        currentUser = teacher;
        document.getElementById('currentUser').textContent = teacher.name + ' 선생님';
        showMainScreen();
        updateDashboard();
        loadStudentsTable();
        loadScheduleGrid();
        loadRecordsTable();
        loadGradesTable();
        loadContactsGrid();
    } else {
        showAlert('잘못된 로그인 정보입니다.', 'error');
    }
}

// 로그아웃
function logout() {
    currentUser = null;
    document.getElementById('teacherId').value = '';
    document.getElementById('teacherPassword').value = '';
    showLoginScreen();
    signOutGoogle();
}

// 화면 전환
function showMainScreen() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainScreen').classList.add('active');
}

function showLoginScreen() {
    document.getElementById('mainScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
}

// 섹션 전환
function showSection(sectionId) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 선택된 섹션 보이기
    document.getElementById(sectionId).classList.add('active');
    
    // 네비게이션 활성화 상태 변경
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
}

// 대시보드 업데이트
function updateDashboard() {
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'active').length;
    const inactiveStudents = students.filter(s => s.status !== 'active').length;
    
    // 오늘 수업 계산
    const today = new Date().getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayClasses = schedules.filter(s => s.day === dayNames[today]).length;
    
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('activeStudents').textContent = activeStudents;
    document.getElementById('inactiveStudents').textContent = inactiveStudents;
    document.getElementById('todayClasses').textContent = todayClasses;
    
    // 최근 활동 업데이트
    updateRecentActivities();
}

// 최근 활동 업데이트
function updateRecentActivities() {
    const recentActivities = document.getElementById('recentActivities');
    const activities = [];
    
    // 최근 등록된 학생
    const recentStudents = students
        .sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate))
        .slice(0, 3);
    
    recentStudents.forEach(student => {
        activities.push({
            icon: 'fas fa-user-plus',
            text: `${student.name} 학생이 등록되었습니다.`,
            time: formatDate(student.registrationDate)
        });
    });
    
    // 최근 수업 기록
    const recentRecords = records
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 2);
    
    recentRecords.forEach(record => {
        const student = students.find(s => s.id === record.studentId);
        activities.push({
            icon: 'fas fa-clipboard-list',
            text: `${student?.name || '알 수 없음'} 학생의 수업이 기록되었습니다.`,
            time: formatDate(record.date)
        });
    });
    
    if (activities.length === 0) {
        recentActivities.innerHTML = '<div class="empty-state"><p>최근 활동이 없습니다.</p></div>';
        return;
    }
    
    recentActivities.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <p>${activity.text}</p>
                <small>${activity.time}</small>
            </div>
        </div>
    `).join('');
}

// 학생 관리
function showStudentModal(studentId = null) {
    const modal = document.getElementById('studentModal');
    const title = document.getElementById('studentModalTitle');
    const form = document.getElementById('studentForm');
    
    if (studentId) {
        const student = students.find(s => s.id === studentId);
        if (student) {
            title.textContent = '학생 정보 수정';
            document.getElementById('studentId').value = student.id;
            document.getElementById('studentName').value = student.name;
            document.getElementById('studentGrade').value = student.grade;
            document.getElementById('studentPhone').value = student.phone || '';
            document.getElementById('parentPhone').value = student.parentPhone;
            document.getElementById('parentName').value = student.parentName || '';
            document.getElementById('studentStatus').value = student.status;
            document.getElementById('studentMemo').value = student.memo || '';
        }
    } else {
        title.textContent = '학생 등록';
        form.reset();
        document.getElementById('studentId').value = '';
    }
    
    modal.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

async function handleStudentSubmit(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('studentId').value;
    const studentData = {
        id: studentId || generateId(),
        name: document.getElementById('studentName').value,
        grade: document.getElementById('studentGrade').value,
        phone: document.getElementById('studentPhone').value,
        parentPhone: document.getElementById('parentPhone').value,
        parentName: document.getElementById('parentName').value,
        status: document.getElementById('studentStatus').value,
        memo: document.getElementById('studentMemo').value,
        registrationDate: studentId ? 
            students.find(s => s.id === studentId).registrationDate : 
            new Date().toISOString()
    };
    
    if (studentId) {
        // 수정
        const index = students.findIndex(s => s.id === studentId);
        students[index] = studentData;
    } else {
        // 추가
        students.push(studentData);
    }
    
    await syncData('students', students);
    closeModal('studentModal');
    loadStudentsTable();
    updateDashboard();
    showAlert('학생 정보가 저장되었습니다.', 'success');
}

function loadStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">등록된 학생이 없습니다.</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.name}</td>
            <td>${student.grade}</td>
            <td>${student.parentPhone}</td>
            <td><span class="status-badge status-${student.status}">${getStatusText(student.status)}</span></td>
            <td>${formatDate(student.registrationDate)}</td>
            <td>
                <button class="action-btn edit" onclick="showStudentModal('${student.id}')" title="수정">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteStudent('${student.id}')" title="삭제">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getStatusText(status) {
    const statusMap = {
        'active': '재원',
        'inactive': '휴원',
        'withdrawn': '퇴원'
    };
    return statusMap[status] || status;
}

async function deleteStudent(studentId) {
    if (confirm('정말 삭제하시겠습니까?')) {
        students = students.filter(s => s.id !== studentId);
        await syncData('students', students);
        loadStudentsTable();
        updateDashboard();
        showAlert('학생이 삭제되었습니다.', 'success');
    }
}

function filterStudents() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchTerm = document.getElementById('searchStudent').value.toLowerCase();
    
    let filteredStudents = students;
    
    if (statusFilter !== 'all') {
        filteredStudents = filteredStudents.filter(s => s.status === statusFilter);
    }
    
    if (searchTerm) {
        filteredStudents = filteredStudents.filter(s => 
            s.name.toLowerCase().includes(searchTerm) ||
            s.parentPhone.includes(searchTerm)
        );
    }
    
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = filteredStudents.map(student => `
        <tr>
            <td>${student.name}</td>
            <td>${student.grade}</td>
            <td>${student.parentPhone}</td>
            <td><span class="status-badge status-${student.status}">${getStatusText(student.status)}</span></td>
            <td>${formatDate(student.registrationDate)}</td>
            <td>
                <button class="action-btn edit" onclick="showStudentModal('${student.id}')" title="수정">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteStudent('${student.id}')" title="삭제">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// 시간표 관리
function showScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    const studentsSelect = document.getElementById('scheduleStudents');
    
    // 학생 목록 채우기
    studentsSelect.innerHTML = students
        .filter(s => s.status === 'active')
        .map(s => `<option value="${s.id}">${s.name} (${s.grade})</option>`)
        .join('');
    
    modal.classList.add('active');
}

async function handleScheduleSubmit(e) {
    e.preventDefault();
    
    const scheduleData = {
        id: generateId(),
        day: document.getElementById('scheduleDay').value,
        time: document.getElementById('scheduleTime').value,
        className: document.getElementById('className').value,
        instructor: document.getElementById('instructor').value,
        students: Array.from(document.getElementById('scheduleStudents').selectedOptions).map(o => o.value)
    };
    
    schedules.push(scheduleData);
    await syncData('schedules', schedules);
    closeModal('scheduleModal');
    loadScheduleGrid();
    updateDashboard();
    showAlert('시간표가 추가되었습니다.', 'success');
}

function loadScheduleGrid() {
    const grid = document.getElementById('scheduleGrid');
    const days = ['', '월', '화', '수', '목', '금', '토', '일'];
    const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    
    let gridHTML = '';
    
    // 헤더 행
    days.forEach(day => {
        if (day) {
            gridHTML += `<div class="schedule-header">${day}</div>`;
        } else {
            gridHTML += `<div class="schedule-header">시간</div>`;
        }
    });
    
    // 시간별 행
    times.forEach(time => {
        gridHTML += `<div class="schedule-time">${time}</div>`;
        
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        dayNames.forEach(dayName => {
            const classAtTime = schedules.find(s => s.day === dayName && s.time === time);
            
            if (classAtTime) {
                const studentNames = classAtTime.students
                    .map(studentId => students.find(s => s.id === studentId)?.name || '알 수 없음')
                    .join(', ');
                
                gridHTML += `
                    <div class="schedule-slot schedule-class">
                        <div class="class-info">
                            <h4>${classAtTime.className}</h4>
                            <p>${classAtTime.instructor}</p>
                            <p>${studentNames}</p>
                        </div>
                    </div>
                `;
            } else {
                gridHTML += `<div class="schedule-slot" onclick="showScheduleModal()">+</div>`;
            }
        });
    });
    
    grid.innerHTML = gridHTML;
}

// 수업 기록 관리
function showRecordModal() {
    const modal = document.getElementById('recordModal');
    const studentSelect = document.getElementById('recordStudent');
    const dateInput = document.getElementById('recordDate');
    
    // 오늘 날짜 설정
    dateInput.value = new Date().toISOString().split('T')[0];
    
    // 학생 목록 채우기
    studentSelect.innerHTML = '<option value="">선택</option>' + 
        students
            .filter(s => s.status === 'active')
            .map(s => `<option value="${s.id}">${s.name} (${s.grade})</option>`)
            .join('');
    
    modal.classList.add('active');
}

async function handleRecordSubmit(e) {
    e.preventDefault();
    
    const recordData = {
        id: generateId(),
        date: document.getElementById('recordDate').value,
        studentId: document.getElementById('recordStudent').value,
        vocabularyScore: document.getElementById('vocabularyScore').value,
        listeningScore: document.getElementById('listeningScore').value,
        homeworkStatus: document.getElementById('homeworkStatus').value,
        memo: document.getElementById('recordMemo').value
    };
    
    records.push(recordData);
    await syncData('records', records);
    closeModal('recordModal');
    loadRecordsTable();
    updateDashboard();
    showAlert('수업 기록이 저장되었습니다.', 'success');
}

function loadRecordsTable() {
    const tbody = document.getElementById('recordsTableBody');
    const studentSelect = document.getElementById('studentFilter');
    
    // 학생 필터 옵션 업데이트
    studentSelect.innerHTML = '<option value="">학생 선택</option>' +
        students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">수업 기록이 없습니다.</td></tr>';
        return;
    }
    
    tbody.innerHTML = records
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(record => {
            const student = students.find(s => s.id === record.studentId);
            return `
                <tr>
                    <td>${formatDate(record.date)}</td>
                    <td>${student?.name || '알 수 없음'}</td>
                    <td>${record.vocabularyScore || '-'}</td>
                    <td>${record.listeningScore || '-'}</td>
                    <td>${record.homeworkStatus || '-'}</td>
                    <td>${record.memo || '-'}</td>
                    <td>
                        <button class="action-btn delete" onclick="deleteRecord('${record.id}')" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
}

async function deleteRecord(recordId) {
    if (confirm('정말 삭제하시겠습니까?')) {
        records = records.filter(r => r.id !== recordId);
        await syncData('records', records);
        loadRecordsTable();
        showAlert('수업 기록이 삭제되었습니다.', 'success');
    }
}

function filterRecords() {
    const studentFilter = document.getElementById('studentFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    let filteredRecords = records;
    
    if (studentFilter) {
        filteredRecords = filteredRecords.filter(r => r.studentId === studentFilter);
    }
    
    if (dateFilter) {
        filteredRecords = filteredRecords.filter(r => r.date === dateFilter);
    }
    
    const tbody = document.getElementById('recordsTableBody');
    tbody.innerHTML = filteredRecords
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(record => {
            const student = students.find(s => s.id === record.studentId);
            return `
                <tr>
                    <td>${formatDate(record.date)}</td>
                    <td>${student?.name || '알 수 없음'}</td>
                    <td>${record.vocabularyScore || '-'}</td>
                    <td>${record.listeningScore || '-'}</td>
                    <td>${record.homeworkStatus || '-'}</td>
                    <td>${record.memo || '-'}</td>
                    <td>
                        <button class="action-btn delete" onclick="deleteRecord('${record.id}')" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
}

// 성적 관리
function showGradeModal() {
    const modal = document.getElementById('gradeModal');
    const studentSelect = document.getElementById('gradeStudent');
    
    // 학생 목록 채우기
    studentSelect.innerHTML = '<option value="">선택</option>' +
        students
            .filter(s => s.status === 'active')
            .map(s => `<option value="${s.id}">${s.name} (${s.grade})</option>`)
            .join('');
    
    modal.classList.add('active');
}

async function handleGradeSubmit(e) {
    e.preventDefault();
    
    const gradeData = {
        id: generateId(),
        studentId: document.getElementById('gradeStudent').value,
        examType: document.getElementById('examType').value,
        subject: document.getElementById('subject').value,
        score: parseInt(document.getElementById('score').value),
        examDate: document.getElementById('examDate').value
    };
    
    grades.push(gradeData);
    await syncData('grades', grades);
    closeModal('gradeModal');
    loadGradesTable();
    showAlert('성적이 저장되었습니다.', 'success');
}

function loadGradesTable() {
    const tbody = document.getElementById('gradesTableBody');
    const studentSelect = document.getElementById('gradeStudentFilter');
    
    // 학생 필터 옵션 업데이트
    studentSelect.innerHTML = '<option value="">학생 선택</option>' +
        students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    if (grades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">성적 기록이 없습니다.</td></tr>';
        return;
    }
    
    tbody.innerHTML = grades
        .sort((a, b) => new Date(b.examDate) - new Date(a.examDate))
        .map(grade => {
            const student = students.find(s => s.id === grade.studentId);
            const examTypeText = {
                'midterm': '중간고사',
                'final': '기말고사',
                'quiz': '쪽지시험'
            }[grade.examType] || grade.examType;
            
            return `
                <tr>
                    <td>${student?.name || '알 수 없음'}</td>
                    <td>${examTypeText}</td>
                    <td>${grade.subject}</td>
                    <td>${grade.score}점</td>
                    <td>${formatDate(grade.examDate)}</td>
                    <td>
                        <button class="action-btn delete" onclick="deleteGrade('${grade.id}')" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
}

async function deleteGrade(gradeId) {
    if (confirm('정말 삭제하시겠습니까?')) {
        grades = grades.filter(g => g.id !== gradeId);
        await syncData('grades', grades);
        loadGradesTable();
        showAlert('성적이 삭제되었습니다.', 'success');
    }
}

function filterGrades() {
    const studentFilter = document.getElementById('gradeStudentFilter').value;
    const examTypeFilter = document.getElementById('examTypeFilter').value;
    
    let filteredGrades = grades;
    
    if (studentFilter) {
        filteredGrades = filteredGrades.filter(g => g.studentId === studentFilter);
    }
    
    if (examTypeFilter) {
        filteredGrades = filteredGrades.filter(g => g.examType === examTypeFilter);
    }
    
    const tbody = document.getElementById('gradesTableBody');
    tbody.innerHTML = filteredGrades
        .sort((a, b) => new Date(b.examDate) - new Date(a.examDate))
        .map(grade => {
            const student = students.find(s => s.id === grade.studentId);
            const examTypeText = {
                'midterm': '중간고사',
                'final': '기말고사',
                'quiz': '쪽지시험'
            }[grade.examType] || grade.examType;
            
            return `
                <tr>
                    <td>${student?.name || '알 수 없음'}</td>
                    <td>${examTypeText}</td>
                    <td>${grade.subject}</td>
                    <td>${grade.score}점</td>
                    <td>${formatDate(grade.examDate)}</td>
                    <td>
                        <button class="action-btn delete" onclick="deleteGrade('${grade.id}')" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
}

// 연락처 관리
function loadContactsGrid() {
    const grid = document.getElementById('contactsGrid');
    
    const activeStudents = students.filter(s => s.status === 'active');
    
    if (activeStudents.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>등록된 학생이 없습니다.</h3></div>';
        return;
    }
    
    grid.innerHTML = activeStudents.map(student => `
        <div class="contact-card">
            <div class="contact-header">
                <div class="contact-avatar">${student.name.charAt(0)}</div>
                <div class="contact-info">
                    <h4>${student.name}</h4>
                    <p>${student.grade}</p>
                </div>
            </div>
            <div class="contact-details">
                ${student.parentName ? `
                    <div class="contact-item">
                        <i class="fas fa-user"></i>
                        <span>${student.parentName}</span>
                    </div>
                ` : ''}
                <div class="contact-item">
                    <i class="fas fa-phone"></i>
                    <span>${student.parentPhone}</span>
                </div>
                ${student.phone ? `
                    <div class="contact-item">
                        <i class="fas fa-mobile-alt"></i>
                        <span>${student.phone}</span>
                    </div>
                ` : ''}
                ${student.memo ? `
                    <div class="contact-item">
                        <i class="fas fa-sticky-note"></i>
                        <span>${student.memo}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// 알림 메시지
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // 기존 알림 제거
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // 메인 콘텐츠 영역에 추가
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(alertDiv, mainContent.firstChild);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Enter 키로 로그인
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.getElementById('loginScreen').classList.contains('active')) {
        login();
    }
});