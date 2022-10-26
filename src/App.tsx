import logo from "./logo.svg";
import "./App.css";
import { useState } from "react";

const VitoApi = {
  baseUrl: "https://openapi.vito.ai",
  CLIENT_ID: process.env.REACT_APP_CLIENT_ID as string,
  CLIENT_SECRET: process.env.REACT_APP_CLIENT_SECRET as string,
};

function App() {
  const [message, setMessage] = useState("");
  const [utternaces, setUtterances] = useState([]);
  const [status, setStatus] = useState<"ready" | "progressing">("ready");

  const uploadFile = async (e: any) => {
    setStatus("progressing");

    try {
      const { files } = e.currentTarget;
      if (!files?.length) {
        setMessage("업로드할 오디오를 지정하세요.");
        setStatus("ready");
        return;
      }

      // 토큰 발급
      setMessage("업로드 중...");
      const token = await authenticate();

      const file = files[0];
      const transcribeObj = await postTranscribe(file, token);

      while (true) {
        await delay(500);
        const response = await getTranscribe(transcribeObj.id, token);
        const status = response.status;

        if (status === "transcribing") {
          setMessage(`변환 중 ${random(["🏃", "🏄", "🏊", "🏋️"])}`);
        } else if (status === "completed") {
          setUtterances(response.results.utterances);
          setMessage("");
          break;
        } else if (status === "failed") {
          setMessage("변환 실패");
          break;
        } else {
          setMessage("알 수 없는 상태");
          break;
        }
      }

      setMessage("");
      setStatus("ready");
    } catch (error) {
      console.error(error);
      setMessage("실패");
      setStatus("ready");
    }

    e.currentTarget.value = undefined;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          <a
            title="VITO Developers"
            href="https://developers.vito.ai/"
            target="_blank"
            rel="noreferrer"
          >
            <img
              src={logo}
              alt="vito developers"
              style={{
                width: 400,
              }}
            />
          </a>
        </h1>
      </header>
      <main>
        {(!VitoApi.CLIENT_ID || !VitoApi.CLIENT_SECRET) && (
          <div className="env">
            <h5>환경변수 설정</h5>
            <p>
              <a
                href={"https://developers.vito.ai/console/"}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "white",
                }}
              >
                개발자 콘솔
              </a>
              에서 Client Id와 Clinet Secret을 가져와 넣어주세요.
            </p>
            <div className="key">
              <label htmlFor="clientId">CLIENT_ID : </label>
              <input
                type="email"
                id="clientId"
                placeholder="abcdefg"
                onChange={(e) => {
                  VitoApi.CLIENT_ID = e.target.value;
                }}
              />
            </div>
            <div className="key">
              <label htmlFor="clientId">CLIENT_SECRET : </label>
              <input
                type="email"
                id="clientId"
                placeholder="abcdefg"
                onChange={(e) => {
                  VitoApi.CLIENT_SECRET = e.target.value;
                }}
              />
            </div>
          </div>
        )}

        <input
          id="upload-btn"
          type="file"
          accept="audio/*"
          style={{
            display: "none",
          }}
          onChange={uploadFile}
        ></input>
        <div className="upload">
          <button
            disabled={status === "progressing"}
            onClick={() => {
              if (!VitoApi.CLIENT_ID) {
                alert("CLIENT_ID를 입력하거나 .env 파일을 생성해주세요.");
                return;
              }
              if (!VitoApi.CLIENT_SECRET) {
                alert("CLIENT_SECRET를 입력하거나 .env 파일을 생성해주세요.");
                return;
              }

              const uploadBtn = document.getElementById("upload-btn");
              if (uploadBtn) {
                uploadBtn.click();
              }
            }}
          >
            오디오 업로드
          </button>
          <p>{message}</p>
        </div>
        <section>
          {utternaces &&
            utternaces.length > 0 &&
            utternaces.map((utterance: any, index) => {
              return (
                <div
                  key={index}
                >{`${utterance.start_at} | ${utterance.duration} | ${utterance.spk} | ${utterance.msg}`}</div>
              );
            })}
        </section>
      </main>
    </div>
  );
}

export default App;

async function authenticate() {
  const form = new FormData();
  form.append("client_id", VitoApi.CLIENT_ID);
  form.append("client_secret", VitoApi.CLIENT_SECRET);
  const response = await fetch(`${VitoApi.baseUrl}/v1/authenticate`, {
    method: "post",
    body: form,
  });

  const result = await response.json();
  const accessKey = result["access_token"];
  return accessKey;
}

async function postTranscribe(file: File, token: any) {
  // config 설정
  // 참고: https://developers.vito.ai/docs/stt-file/#%EC%9A%94%EC%B2%AD-%EB%B0%94%EB%94%94-request-body
  const config = {
    diarization: {
      use_ars: false,
      use_verification: false,
    },
    use_multi_channel: false,
    use_itn: true,
    use_disfluency_filter: false,
    use_profanity_filter: false,
    paragraph_splitter: {
      min: 15,
      max: 80,
    },
  };

  const form = new FormData();
  form.append("config", JSON.stringify(config));
  form.append("file", file);

  const url = `${VitoApi.baseUrl}/v1/transcribe`;
  const response = await fetch(url, {
    method: "post",
    body: form,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return await response.json();
}

async function getTranscribe(id: string, token: any) {
  const url = `${VitoApi.baseUrl}/v1/transcribe/${id}`;
  const result = await fetch(url, {
    method: "get",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await result.json();
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function random(array: any[]) {
  return array[Math.floor(Math.random() * array.length)];
}
