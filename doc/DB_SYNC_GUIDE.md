# DB 동기화 가이드 (GitHub CLI 사용)

이 문서는 여러 기기(노트북, 데스크탑 등) 간에 `dailyport.db` 파일을 공유하기 위한 방법을 설명합니다. GitHub의 **Releases** 기능을 데이터 저장소로 활용합니다.

## 1. 초기 설정 (GitHub CLI 설치)

스크립트를 사용하기 위해 GitHub CLI(`gh`)가 필요합니다.

### 설치 방법 (Windows)
1. **PowerShell** 또는 **명령 프롬프트(CMD)**를 관리자 권한으로 실행합니다.
2. 아래 명령어를 입력하여 설치합니다:
   ```powershell
   winget install --id GitHub.cli
   ```
3. 설치가 완료되면 터미널을 껐다 킨 후, 로그인을 진행합니다:
   ```powershell
   gh auth login
   ```
   - `GitHub.com` 선택
   - `HTTPS` 선택
   - `Authenticate with a web browser` 선택하여 브라우저에서 로그인 승인

### 삭제 방법
설비가 더 이상 필요하지 않으면 아래 명령어로 삭제할 수 있습니다:
```powershell
winget uninstall --id GitHub.cli
```

---

## 2. 사용 방법

프로젝트 루트 폴더에 있는 배치 파일을 실행하면 됩니다.

### 데이터 업로드하기 (작업 마친 후)
- `upload_db.bat` 파일을 실행합니다.
- 현재의 `dailyport.db` 파일이 GitHub Release 섹션에 업로드됩니다. (기존 데이터는 덮어씌워집니다.)

### 데이터 불러오기 (작업 시작 전)
- `download_db.bat` 파일을 실행합니다.
- GitHub에 올라와 있는 최신 `dailyport.db`를 다운로드하여 로컬 파일을 교체합니다.

> [!WARNING]
> **데이터 덮어쓰기 주의**: 다운로드 시 로컬에 이미 있던 `dailyport.db`는 삭제되고 서버의 파일로 교체됩니다. 중요한 데이터가 있다면 미리 백업하세요.

---

## 3. 원리

- 이 방식은 `db-sync`라는 이름의 Git 태그(Tag)와 릴리즈(Release)를 생성하여 파일을 관리합니다.
- 실제 소스 코드의 버전 관리(Release)와는 충돌하지 않도록 별도의 태그를 사용합니다.
- DB 구조가 변경되어도 파일 자체를 교체하는 방식이므로 유연하게 대응 가능합니다.
