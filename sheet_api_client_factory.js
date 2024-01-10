const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'accessToken.json';

class SheetApiClientFactory {
    static async create() {
        // 구글 OAuth 클라이언트 사용을 위해 credentials.json 파일을 읽어온다.
        const credential = fs.readFileSync('credentials.json');
        // 해당 파일을 이용해서 OAuth 인증 절차 진행
        const auth = await this._authorize(JSON.parse(credential));
        // 생성된 OAuth 클라이언트로 인증이 완료되면 구글 스프레드시트 API 클라이언트를 생성해서 반환
        return google.sheets({ version: 'v4', auth });
    }

    static async _authorize(credentials) {
        // 구글 OAuth 클라이언트 정보를 가져온다.
        const { client_secret, client_id, redirect_uris } = credentials.installed;
        // OAuth2 클라이언트 생성
        const oAuth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirect_uris[0],
        );
        
        // 기존에 발급받아둔 엑세스 토큰이 없다면 새롭게 발급받는다.
        if(!fs.existsSync(TOKEN_PATH)) {
            // 토큰이 없으면 토큰을 생성한다.
            const token = await this._getNewToken(oAuth2Client);
            oAuth2Client.setCredentials(token);

            fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
            console.log('Token stored to', TOKEN_PATH);

            return oAuth2Client;
        }

        // 기존에 발급받아둔 엑세스 토큰이 있다면 해당 토큰을 이용해서 OAuth 클라이언트를 생성한다.
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        oAuth2Client.setCredentials(token);
        return oAuth2Client;
    }

    static async _getNewToken(oAuth2Client) {
        // OAuth 인증 절차를 진행하기 위해 URL을 생성한다.
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });

        console.log('다음 URL을 브라우저에서 열어 인증을 진행하세요: ', authUrl);

        // 터미널에서 키보드 입력을 받기 위해 readline 인터페이스를 생성한다.
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        // 인증이 완료되면 발급된 코드를 입력받는다.
        const code = await new Promise((resolve) => {
            rl.question('인증이 완료되어 발급된 코드를 여기에 붙여넣으세요: ', (code) => {
                resolve(code);
            });
        });

        rl.close();
        // 인증 코드를 이용해서 엑세스 토큰을 발급받는다.
        const resp = await oAuth2Client.getToken(code);
        return resp.tokens;
    }
}

module.exports = SheetApiClientFactory;