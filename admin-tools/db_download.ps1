# dailyport.db 다운로드 스크립트

$DB_FILE = "dailyport.db"
$RELEASE_TAG = "db-sync"
$REPO_PATH = (git rev-parse --show-toplevel)

Set-Location $REPO_PATH

# gh CLI 체크
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI(gh)가 설치되어 있지 않습니다. 서비스 사용을 위해 먼저 gh를 설치해 주세요."
    exit 1
}

Write-Host "GitHub Release ($RELEASE_TAG)에서 최신 DB 다운로드를 시작합니다..."

# 다운로드 (기존 파일 덮어쓰기 위해 --clobber 사용 가능하지만 asset 다운로드는 기본적으로 파일명 지정)
gh release download $RELEASE_TAG --pattern $DB_FILE --clobber

if ($lastExitCode -eq 0) {
    Write-Host "다운로드 및 교체 완료!" -ForegroundColor Green
} else {
    Write-Error "다운로드 중 오류가 발생했습니다. 업로드된 DB가 있는지 확인해 주세요."
}
