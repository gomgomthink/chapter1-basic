import { useState } from 'react'
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import { Box, Button, Typography, Card, CardContent, Grid } from '@mui/material'

// 더미 대시보드 데이터
const dummyDashboard = {
  totalStudents: 120,
  enrolled: 100,
  onLeave: 10,
  withdrawn: 10,
  todayClasses: 8,
  pendingHomework: 3,
}

function App() {
  const [user, setUser] = useState<any>(null)

  // 로그인 성공 시 콜백
  const handleLoginSuccess = (credentialResponse: any) => {
    setUser(credentialResponse)
  }

  // 로그아웃
  const handleLogout = () => {
    setUser(null)
    googleLogout()
  }

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" bgcolor="#f5f6fa">
      {!user ? (
        <Card sx={{ minWidth: 320, p: 3 }}>
          <CardContent>
            <Typography variant="h5" mb={2} align="center">학원관리 로그인</Typography>
            <Box display="flex" justifyContent="center">
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={() => alert('로그인 실패!')}
                useOneTap
              />
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box width="100%" maxWidth={600}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4">대시보드</Typography>
            <Button variant="outlined" color="secondary" onClick={handleLogout}>로그아웃</Button>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4}>
              <Card><CardContent><Typography variant="subtitle2">전체 학생</Typography><Typography variant="h5">{dummyDashboard.totalStudents}</Typography></CardContent></Card>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Card><CardContent><Typography variant="subtitle2">재원생</Typography><Typography variant="h5">{dummyDashboard.enrolled}</Typography></CardContent></Card>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Card><CardContent><Typography variant="subtitle2">휴원생</Typography><Typography variant="h5">{dummyDashboard.onLeave}</Typography></CardContent></Card>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Card><CardContent><Typography variant="subtitle2">퇴원생</Typography><Typography variant="h5">{dummyDashboard.withdrawn}</Typography></CardContent></Card>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Card><CardContent><Typography variant="subtitle2">오늘 수업</Typography><Typography variant="h5">{dummyDashboard.todayClasses}</Typography></CardContent></Card>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Card><CardContent><Typography variant="subtitle2">미제출 숙제</Typography><Typography variant="h5">{dummyDashboard.pendingHomework}</Typography></CardContent></Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  )
}

export default App
