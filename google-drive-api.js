// Google Drive API 설정
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let gapi;
let tokenClient;
let isGapiLoaded = false;
let isGisLoaded = false;

// 데이터 파일 이름들
const DATA_FILES = {
    students: 'academy_students.json',
    schedules: 'academy_schedules.json',
    records: 'academy_records.json',
    grades: 'academy_grades.json',
    teachers: 'academy_teachers.json'
};

// Google API 초기화
function initializeGapi() {
    gapi.load('auth2', () => {
        gapi.load('client', async () => {
            await gapi.client.init({
                apiKey: 'YOUR_API_KEY', // 실제 API 키로 교체 필요
                clientId: 'YOUR_CLIENT_ID', // 실제 클라이언트 ID로 교체 필요
                discoveryDocs: [DISCOVERY_DOC],
                scope: SCOPES
            });
            isGapiLoaded = true;
            maybeEnableButtons();
        });
    });
}

function initializeGis() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: 'YOUR_CLIENT_ID', // 실제 클라이언트 ID로 교체 필요
        scope: SCOPES,
        callback: (resp) => {
            if (resp.error !== undefined) {
                throw (resp);
            }
            maybeEnableButtons();
        },
    });
    isGisLoaded = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (isGapiLoaded && isGisLoaded) {
        console.log('Google APIs loaded successfully');
    }
}

// Google 로그인
async function signInWithGoogle() {
    try {
        if (!gapi.client.getToken()) {
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            tokenClient.requestAccessToken({prompt: ''});
        }
        
        // 로그인 성공 후 메인 화면으로 이동
        const userProfile = await gapi.client.request({
            path: 'https://www.googleapis.com/oauth2/v1/userinfo',
        });
        
        document.getElementById('currentUser').textContent = userProfile.result.name;
        showMainScreen();
        
    } catch (error) {
        console.error('Google 로그인 실패:', error);
        showAlert('Google 로그인에 실패했습니다.', 'error');
    }
}

// 로그아웃
function signOutGoogle() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
    }
}

// 파일 검색
async function findFile(fileName) {
    try {
        const response = await gapi.client.drive.files.list({
            q: `name='${fileName}' and parents in 'appDataFolder'`,
            fields: 'files(id, name)'
        });
        
        return response.result.files.length > 0 ? response.result.files[0] : null;
    } catch (error) {
        console.error('파일 검색 실패:', error);
        return null;
    }
}

// 파일 생성
async function createFile(fileName, data) {
    try {
        const fileMetadata = {
            name: fileName,
            parents: ['appDataFolder']
        };
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(fileMetadata)], {type: 'application/json'}));
        form.append('file', new Blob([JSON.stringify(data)], {type: 'application/json'}));
        
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`
            }),
            body: form
        });
        
        return await response.json();
    } catch (error) {
        console.error('파일 생성 실패:', error);
        throw error;
    }
}

// 파일 업데이트
async function updateFile(fileId, data) {
    try {
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(data)
        });
        
        return await response.json();
    } catch (error) {
        console.error('파일 업데이트 실패:', error);
        throw error;
    }
}

// 파일 읽기
async function readFile(fileId) {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        return JSON.parse(response.body);
    } catch (error) {
        console.error('파일 읽기 실패:', error);
        return null;
    }
}

// 데이터 저장
async function saveData(dataType, data) {
    try {
        const fileName = DATA_FILES[dataType];
        if (!fileName) {
            throw new Error('잘못된 데이터 타입');
        }
        
        let file = await findFile(fileName);
        
        if (file) {
            await updateFile(file.id, data);
        } else {
            await createFile(fileName, data);
        }
        
        console.log(`${dataType} 데이터 저장 완료`);
        return true;
    } catch (error) {
        console.error('데이터 저장 실패:', error);
        showAlert('데이터 저장에 실패했습니다.', 'error');
        return false;
    }
}

// 데이터 불러오기
async function loadData(dataType) {
    try {
        const fileName = DATA_FILES[dataType];
        if (!fileName) {
            throw new Error('잘못된 데이터 타입');
        }
        
        const file = await findFile(fileName);
        
        if (file) {
            const data = await readFile(file.id);
            return data || [];
        } else {
            // 파일이 없으면 빈 배열 반환
            return [];
        }
    } catch (error) {
        console.error('데이터 불러오기 실패:', error);
        return [];
    }
}

// 로컬 스토리지 백업 (오프라인 지원)
function saveToLocalStorage(dataType, data) {
    try {
        localStorage.setItem(`academy_${dataType}`, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('로컬 저장소 저장 실패:', error);
        return false;
    }
}

function loadFromLocalStorage(dataType) {
    try {
        const data = localStorage.getItem(`academy_${dataType}`);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('로컬 저장소 불러오기 실패:', error);
        return [];
    }
}

// 데이터 동기화
async function syncData(dataType, data) {
    // 로컬 저장소에 먼저 저장
    saveToLocalStorage(dataType, data);
    
    // Google Drive에 저장 시도
    if (gapi && gapi.client.getToken()) {
        await saveData(dataType, data);
    }
}

// 데이터 로드 (온라인/오프라인 지원)
async function getData(dataType) {
    if (gapi && gapi.client.getToken()) {
        // 온라인: Google Drive에서 불러오기
        const data = await loadData(dataType);
        // 로컬에도 백업
        saveToLocalStorage(dataType, data);
        return data;
    } else {
        // 오프라인: 로컬 저장소에서 불러오기
        return loadFromLocalStorage(dataType);
    }
}

// 초기화 함수들
document.addEventListener('DOMContentLoaded', () => {
    // Google API 스크립트가 로드되면 초기화
    if (typeof gapi !== 'undefined') {
        initializeGapi();
    }
    
    if (typeof google !== 'undefined') {
        initializeGis();
    }
});

// Google API 스크립트 로드 콜백
window.gapiLoaded = () => {
    initializeGapi();
};

window.gisLoaded = () => {
    initializeGis();
};

// 유틸리티 함수들
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('ko-KR');
}

function formatDateTime(date) {
    return new Date(date).toLocaleString('ko-KR');
}

// 오류 처리
function handleApiError(error, operation) {
    console.error(`${operation} 실패:`, error);
    
    let message = '작업을 완료할 수 없습니다.';
    
    if (error.status === 401) {
        message = '로그인이 필요합니다.';
        // 재로그인 유도
        signInWithGoogle();
    } else if (error.status === 403) {
        message = '권한이 부족합니다.';
    } else if (error.status === 404) {
        message = '데이터를 찾을 수 없습니다.';
    } else if (error.status >= 500) {
        message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    
    showAlert(message, 'error');
}