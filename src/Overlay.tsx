import { useEffect, useRef, useState } from "react";
import "./Overlay.css";

type Position = {
  x: number;
  y: number;
};

type GachaEvent = {
  type: "gacha";
  result: string;
  position: Position;
  fontSize: number;
  rotation: number;
  timestamp: number;
};

function Overlay() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const hideTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const playTimerRef = useRef<number | null>(null);

  const [visible, setVisible] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const [result, setResult] = useState("");

  const [position, setPosition] = useState<Position>({
    x: 50,
    y: 50,
  });

  const [fontSize, setFontSize] = useState(56);
  const [rotation, setRotation] = useState(0);

  /*
   * ========================================
   * WebSocket接続先
   * ========================================
   *
   * ローカル:
   * http://localhost:5173
   * ↓
   * ws://localhost:5173/ws
   *
   * Cloudflare:
   * https://xxxxx.trycloudflare.com
   * ↓
   * wss://xxxxx.trycloudflare.com/ws
   */

  const getWebSocketUrl = () => {
    const protocol =
      window.location.protocol === "https:"
        ? "wss:"
        : "ws:";

    return `${protocol}//${window.location.host}/ws`;
  };

  /*
   * ========================================
   * WebSocket接続
   * ========================================
   */

  useEffect(() => {
    let ws: WebSocket | null = null;
    let isUnmounted = false;

    const scheduleReconnect = () => {
      if (isUnmounted) {
        return;
      }

      if (reconnectTimerRef.current !== null) {
        return;
      }

      console.log(
        "Overlay WebSocketを5秒後に再接続します"
      );

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;

        connect();
      }, 5000);
    };

    const connect = () => {
      if (isUnmounted) {
        return;
      }

      const wsUrl = getWebSocketUrl();

      console.log(
        "Overlay WebSocket接続開始:",
        wsUrl
      );

      try {
        ws = new WebSocket(wsUrl);
      } catch (error) {
        console.error(
          "WebSocket作成エラー:",
          error
        );

        scheduleReconnect();

        return;
      }

      /*
       * ========================================
       * WebSocket接続成功
       * ========================================
       */

      ws.onopen = () => {
        console.log(
          "Overlay WebSocket接続成功:",
          wsUrl
        );
      };

      /*
       * ========================================
       * メッセージ受信
       * ========================================
       */

      ws.onmessage = (event) => {
        try {
          const data: GachaEvent =
            JSON.parse(event.data);

          /*
           * ガチャイベント以外は無視
           */

          if (data.type !== "gacha") {
            return;
          }

          console.log(
            "ガチャイベント受信:",
            data
          );

          /*
           * 古いタイマーを解除
           */

          if (hideTimerRef.current !== null) {
            window.clearTimeout(
              hideTimerRef.current
            );

            hideTimerRef.current = null;
          }

          if (playTimerRef.current !== null) {
            window.clearTimeout(
              playTimerRef.current
            );

            playTimerRef.current = null;
          }

          /*
           * ========================================
           * ガチャ情報反映
           * ========================================
           */

          setResult(data.result);

          setPosition(data.position);

          setFontSize(data.fontSize);

          setRotation(data.rotation);

          /*
           * 結果文字を一旦非表示
           */

          setShowResult(false);

          /*
           * 配信画面を表示
           */

          setVisible(true);

          /*
           * ========================================
           * 動画再生
           * ========================================
           */

          playTimerRef.current = window.setTimeout(() => {
            const video = videoRef.current;

            if (!video) {
              console.error(
                "Overlay動画要素が見つかりません"
              );

              return;
            }

            /*
             * 動画を最初に戻す
             */

            video.pause();

            video.currentTime = 0;

            /*
             * OBSでは音声不要
             */

            video.muted = true;
            video.volume = 0;

            /*
             * 動画再生
             */

            const playPromise = video.play();

            if (playPromise !== undefined) {
              playPromise.catch((error) => {
                console.error(
                  "Overlay動画の再生に失敗しました:",
                  error
                );
              });
            }
          }, 100);
        } catch (error) {
          console.error(
            "ガチャ情報の解析に失敗しました:",
            error
          );
        }
      };

      /*
       * ========================================
       * WebSocketエラー
       * ========================================
       */

      ws.onerror = (error) => {
        console.error(
          "Overlay WebSocketエラー:",
          error
        );
      };

      /*
       * ========================================
       * WebSocket切断
       * ========================================
       */

      ws.onclose = () => {
        console.log(
          "Overlay WebSocket切断"
        );

        if (!isUnmounted) {
          scheduleReconnect();
        }
      };
    };

    /*
     * 初回接続
     */

    connect();

    /*
     * ========================================
     * クリーンアップ
     * ========================================
     */

    return () => {
      isUnmounted = true;

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(
          reconnectTimerRef.current
        );

        reconnectTimerRef.current = null;
      }

      if (hideTimerRef.current !== null) {
        window.clearTimeout(
          hideTimerRef.current
        );

        hideTimerRef.current = null;
      }

      if (playTimerRef.current !== null) {
        window.clearTimeout(
          playTimerRef.current
        );

        playTimerRef.current = null;
      }

      if (ws) {
        ws.close();
        ws = null;
      }
    };
  }, []);

  /*
   * ========================================
   * 動画時間監視
   * ========================================
   */

  const handleTimeUpdate = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    /*
     * 動画の長さが取得できていない場合
     */

    if (!Number.isFinite(video.duration)) {
      return;
    }

    const remaining =
      video.duration -
      video.currentTime;

    /*
     * 残り1秒で結果文字を表示
     */

    if (
      remaining <= 1 &&
      remaining > 0 &&
      !showResult
    ) {
      setShowResult(true);
    }
  };

  /*
   * ========================================
   * 動画終了
   * ========================================
   */

  const handleVideoEnded = () => {
    /*
     * 動画終了後2秒間は
     * 結果文字を表示
     */

    if (hideTimerRef.current !== null) {
      window.clearTimeout(
        hideTimerRef.current
      );
    }

    hideTimerRef.current = window.setTimeout(() => {
      /*
       * 結果文字を消す
       */

      setShowResult(false);

      /*
       * 動画も画面から消す
       */

      setVisible(false);

      hideTimerRef.current = null;
    }, 2000);
  };

  /*
   * ========================================
   * 画面
   * ========================================
   */

  return (
    <div className="overlay">
      {visible && (
        <>
          <video
            ref={videoRef}
            className="overlay-video"
            src="/videos/gacha.mp4"
            muted
            playsInline
            autoPlay={false}
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
          />

          <div
            className={`
              overlay-result
              ${showResult ? "visible" : ""}
            `}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              fontSize: `${fontSize}px`,
              transform:
                `translate(-50%, -50%) ` +
                `rotate(${rotation}deg)`,
            }}
          >
            {result}
          </div>
        </>
      )}
    </div>
  );
}

export default Overlay;