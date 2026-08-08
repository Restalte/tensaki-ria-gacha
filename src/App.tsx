import { useEffect, useRef, useState } from "react";
import "./App.css";

type ResultItem = {
  id: number;
  name: string;
  probability: number;
};

type Position = {
  x: number;
  y: number;
};

type SavedSettings = {
  position: Position;
  fontSize: number;
  rotation: number;
  results: ResultItem[];
  rustleVolume: number;
  sparkleVolume: number;
  decisionVolume: number;
  shortcutKey: string;
};

type GachaEvent = {
  type: "gacha";
  result: string;
  position: Position;
  fontSize: number;
  rotation: number;
  timestamp: number;
};

const DEFAULT_RESULTS: ResultItem[] = [
  {
    id: 1,
    name: "大当たり！",
    probability: 5,
  },
  {
    id: 2,
    name: "当たり！",
    probability: 20,
  },
  {
    id: 3,
    name: "もう一回！",
    probability: 25,
  },
  {
    id: 4,
    name: "残念……",
    probability: 50,
  },
];

const DEFAULT_SETTINGS: SavedSettings = {
  position: {
    x: 39.4,
    y: 27.6,
  },

  fontSize: 16,

  rotation: -14,

  results: DEFAULT_RESULTS,

  rustleVolume: 100,

  sparkleVolume: 100,

  decisionVolume: 100,

  shortcutKey: " ",
};

function App() {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const previewVideoRef =
    useRef<HTMLVideoElement>(null);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const wsRef =
    useRef<WebSocket | null>(null);

  const hideTimerRef =
    useRef<number | null>(null);

  const previewHideTimerRef =
    useRef<number | null>(null);

  /*
   * ================================
   * 効果音
   * ================================
   */

  const rustleAudioRef =
    useRef<HTMLAudioElement | null>(null);

  const sparkleAudioRef =
    useRef<HTMLAudioElement | null>(null);

  const decisionAudioRef =
    useRef<HTMLAudioElement | null>(null);

  /*
   * ================================
   * 効果音タイマー
   * ================================
   */

  const soundTimer1Ref =
    useRef<number | null>(null);

  const soundTimer2Ref =
    useRef<number | null>(null);

  const soundTimer3Ref =
    useRef<number | null>(null);

  /*
   * ================================
   * 状態
   * ================================
   */

  const [result, setResult] =
    useState("？");

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [previewVisible, setPreviewVisible] =
    useState(false);

  const [showResult, setShowResult] =
    useState(false);

  const [
    previewShowResult,
    setPreviewShowResult,
  ] = useState(false);

  const [position, setPosition] =
    useState<Position>(
      DEFAULT_SETTINGS.position
    );

  const [fontSize, setFontSize] =
    useState(
      DEFAULT_SETTINGS.fontSize
    );

  const [rotation, setRotation] =
    useState(
      DEFAULT_SETTINGS.rotation
    );

  const [results, setResults] =
    useState<ResultItem[]>(
      DEFAULT_RESULTS
    );

  /*
   * ================================
   * 効果音音量
   * ================================
   */

  const [rustleVolume, setRustleVolume] =
    useState(
      DEFAULT_SETTINGS.rustleVolume
    );

  const [sparkleVolume, setSparkleVolume] =
    useState(
      DEFAULT_SETTINGS.sparkleVolume
    );

  const [decisionVolume, setDecisionVolume] =
    useState(
      DEFAULT_SETTINGS.decisionVolume
    );

  /*
   * ================================
   * ショートカットキー
   * ================================
   */

  const [shortcutKey, setShortcutKey] =
    useState(
      DEFAULT_SETTINGS.shortcutKey
    );

  const [isSettingShortcut, setIsSettingShortcut] =
    useState(false);

  const [dragging, setDragging] =
    useState(false);

  /*
   * ================================
   * 効果音を準備
   * ================================
   */

  useEffect(() => {
    const rustle =
      new Audio(
        "/sounds/Drawing_Box02-01(Rustle).mp3"
      );

    const sparkle =
      new Audio(
        "/sounds/ひらめき.mp3"
      );

    const decision =
      new Audio(
        "/sounds/決定.mp3"
      );

    rustle.preload = "auto";
    sparkle.preload = "auto";
    decision.preload = "auto";

    rustleAudioRef.current = rustle;
    sparkleAudioRef.current = sparkle;
    decisionAudioRef.current = decision;

    return () => {
      rustle.pause();
      sparkle.pause();
      decision.pause();

      rustle.currentTime = 0;
      sparkle.currentTime = 0;
      decision.currentTime = 0;

      if (
        soundTimer1Ref.current !== null
      ) {
        clearTimeout(
          soundTimer1Ref.current
        );
      }

      if (
        soundTimer2Ref.current !== null
      ) {
        clearTimeout(
          soundTimer2Ref.current
        );
      }

      if (
        soundTimer3Ref.current !== null
      ) {
        clearTimeout(
          soundTimer3Ref.current
        );
      }
    };
  }, []);

  /*
   * ================================
   * 音量をリアルタイム反映
   * ================================
   */

  useEffect(() => {
    if (rustleAudioRef.current) {
      rustleAudioRef.current.volume =
        rustleVolume / 100;
    }
  }, [rustleVolume]);

  useEffect(() => {
    if (sparkleAudioRef.current) {
      sparkleAudioRef.current.volume =
        sparkleVolume / 100;
    }
  }, [sparkleVolume]);

  useEffect(() => {
    if (decisionAudioRef.current) {
      decisionAudioRef.current.volume =
        decisionVolume / 100;
    }
  }, [decisionVolume]);

  /*
   * ================================
   * WebSocket接続
   * ================================
   */

  useEffect(() => {
    let reconnectTimer:
      number | null = null;

    const connectWebSocket = () => {
      const protocol =
        window.location.protocol ===
        "https:"
          ? "wss:"
          : "ws:";

      const wsUrl =
        `${protocol}//${window.location.host}/ws`;

      const ws =
        new WebSocket(wsUrl);

      wsRef.current = ws;

      ws.onopen = () => {
        console.log(
          "WebSocket接続成功"
        );
      };

      ws.onclose = () => {
        console.log(
          "WebSocket切断"
        );

        reconnectTimer =
          window.setTimeout(() => {
            connectWebSocket();
          }, 5000);
      };

      ws.onerror = (error) => {
        console.error(
          "WebSocketエラー:",
          error
        );
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimer) {
        clearTimeout(
          reconnectTimer
        );
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  /*
   * ================================
   * 設定読み込み
   * ================================
   */

  useEffect(() => {
    const savedSettings =
      localStorage.getItem(
        "gacha-settings"
      );

    if (!savedSettings) {
      return;
    }

    try {
      const settings: SavedSettings =
        JSON.parse(
          savedSettings
        );

      if (settings.position) {
        setPosition(
          settings.position
        );
      }

      if (
        typeof settings.fontSize ===
        "number"
      ) {
        setFontSize(
          settings.fontSize
        );
      }

      if (
        typeof settings.rotation ===
        "number"
      ) {
        setRotation(
          settings.rotation
        );
      }

      if (
        Array.isArray(
          settings.results
        ) &&
        settings.results.length > 0
      ) {
        setResults(
          settings.results
        );
      }

      if (
        typeof settings.rustleVolume ===
        "number"
      ) {
        setRustleVolume(
          settings.rustleVolume
        );
      }

      if (
        typeof settings.sparkleVolume ===
        "number"
      ) {
        setSparkleVolume(
          settings.sparkleVolume
        );
      }

      if (
        typeof settings.decisionVolume ===
        "number"
      ) {
        setDecisionVolume(
          settings.decisionVolume
        );
      }

      if (
        typeof settings.shortcutKey ===
        "string"
      ) {
        setShortcutKey(
          settings.shortcutKey
        );
      }
    } catch (error) {
      console.error(
        "設定の読み込みに失敗しました。",
        error
      );
    }
  }, []);

  /*
   * ================================
   * 設定保存
   * ================================
   */

  useEffect(() => {
    const settings: SavedSettings = {
      position,
      fontSize,
      rotation,
      results,
      rustleVolume,
      sparkleVolume,
      decisionVolume,
      shortcutKey,
    };

    localStorage.setItem(
      "gacha-settings",
      JSON.stringify(
        settings
      )
    );
  }, [
    position,
    fontSize,
    rotation,
    results,
    rustleVolume,
    sparkleVolume,
    decisionVolume,
    shortcutKey,
  ]);

  /*
   * ================================
   * ショートカットキー設定
   * ================================
   */

  useEffect(() => {
    const handleShortcutSetting = (
      e: KeyboardEvent
    ) => {
      if (!isSettingShortcut) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setIsSettingShortcut(false);
        return;
      }

      if (
        e.key === "Control" ||
        e.key === "Shift" ||
        e.key === "Alt" ||
        e.key === "Meta"
      ) {
        return;
      }

      setShortcutKey(e.key);
      setIsSettingShortcut(false);
    };

    window.addEventListener(
      "keydown",
      handleShortcutSetting
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleShortcutSetting
      );
    };
  }, [isSettingShortcut]);

  /*
   * ================================
   * 合計確率
   * ================================
   */

  const totalProbability =
    results.reduce(
      (total, item) =>
        total + item.probability,
      0
    );

  /*
   * ================================
   * 確率抽選
   * ================================
   */

  const selectResult = () => {
    const random =
      Math.random() *
      totalProbability;

    let current = 0;

    for (const item of results) {
      current +=
        item.probability;

      if (random < current) {
        return item.name;
      }
    }

    return (
      results[
        results.length - 1
      ]?.name ?? "？"
    );
  };

  /*
   * ================================
   * WebSocket送信
   * ================================
   */

  const sendGachaEvent = (
    gachaEvent: GachaEvent
  ) => {
    const ws =
      wsRef.current;

    if (
      ws &&
      ws.readyState ===
        WebSocket.OPEN
    ) {
      ws.send(
        JSON.stringify(
          gachaEvent
        )
      );

      console.log(
        "OBSへガチャ情報を送信:",
        gachaEvent
      );
    } else {
      console.warn(
        "WebSocket未接続です。"
      );
    }
  };

  /*
   * ================================
   * 効果音再生
   * ================================
   */

  const playGachaSounds = () => {
    if (
      soundTimer1Ref.current !== null
    ) {
      clearTimeout(
        soundTimer1Ref.current
      );

      soundTimer1Ref.current =
        null;
    }

    if (
      soundTimer2Ref.current !== null
    ) {
      clearTimeout(
        soundTimer2Ref.current
      );

      soundTimer2Ref.current =
        null;
    }

    if (
      soundTimer3Ref.current !== null
    ) {
      clearTimeout(
        soundTimer3Ref.current
      );

      soundTimer3Ref.current =
        null;
    }

    if (rustleAudioRef.current) {
      rustleAudioRef.current.pause();

      rustleAudioRef.current.currentTime =
        0;
    }

    if (sparkleAudioRef.current) {
      sparkleAudioRef.current.pause();

      sparkleAudioRef.current.currentTime =
        0;
    }

    if (decisionAudioRef.current) {
      decisionAudioRef.current.pause();

      decisionAudioRef.current.currentTime =
        0;
    }

    soundTimer1Ref.current =
      window.setTimeout(() => {
        const rustle =
          rustleAudioRef.current;

        if (!rustle) {
          return;
        }

        rustle.currentTime = 0;

        rustle.volume =
          rustleVolume / 100;

        rustle.play().catch(
          (error) => {
            console.error(
              "くじを漁る音の再生に失敗:",
              error
            );
          }
        );
      }, 2000);

    soundTimer2Ref.current =
      window.setTimeout(() => {
        const rustle =
          rustleAudioRef.current;

        const sparkle =
          sparkleAudioRef.current;

        if (rustle) {
          rustle.pause();

          rustle.currentTime =
            0;
        }

        if (sparkle) {
          sparkle.currentTime =
            0;

          sparkle.volume =
            sparkleVolume / 100;

          sparkle.play().catch(
            (error) => {
              console.error(
                "ひらめき音の再生に失敗:",
                error
              );
            }
          );
        }
      }, 4000);

    soundTimer3Ref.current =
      window.setTimeout(() => {
        const decision =
          decisionAudioRef.current;

        if (!decision) {
          return;
        }

        decision.currentTime =
          0;

        decision.volume =
          decisionVolume / 100;

        decision.play().catch(
          (error) => {
            console.error(
              "決定音の再生に失敗:",
              error
            );
          }
        );
      }, 8000);
  };

  /*
   * ================================
   * ガチャ開始
   * ================================
   */

  const spinGacha = () => {
    if (!videoRef.current) {
      return;
    }

    if (
      Math.abs(
        totalProbability - 100
      ) > 0.001
    ) {
      alert(
        `確率の合計を100%にしてください。\n現在：${totalProbability}%`
      );

      return;
    }

    if (hideTimerRef.current) {
      clearTimeout(
        hideTimerRef.current
      );

      hideTimerRef.current =
        null;
    }

    if (
      previewHideTimerRef.current
    ) {
      clearTimeout(
        previewHideTimerRef.current
      );

      previewHideTimerRef.current =
        null;
    }

    playGachaSounds();

    const randomResult =
      selectResult();

    setResult(
      randomResult
    );

    const gachaEvent: GachaEvent = {
      type: "gacha",

      result:
        randomResult,

      position: {
        x: position.x,
        y: position.y,
      },

      fontSize,

      rotation,

      timestamp:
        Date.now(),
    };

    sendGachaEvent(
      gachaEvent
    );

    setShowResult(false);

    setIsPlaying(true);

    videoRef.current.currentTime =
      0;

    const playPromise =
      videoRef.current.play();

    if (
      playPromise !== undefined
    ) {
      playPromise.catch(
        (error) => {
          console.error(
            "操作画面の動画再生に失敗:",
            error
          );

          setIsPlaying(false);
        }
      );
    }

    setPreviewShowResult(
      false
    );

    setPreviewVisible(
      true
    );

    setTimeout(() => {
      if (
        previewVideoRef.current
      ) {
        previewVideoRef.current.currentTime =
          0;

        previewVideoRef.current
          .play()
          .catch((error) => {
            console.error(
              "プレビュー動画の再生に失敗:",
              error
            );
          });
      }
    }, 50);
  };

  /*
   * ================================
   * キーボードショートカット
   * ================================
   */

  useEffect(() => {
    const handleKeyDown = (
      e: KeyboardEvent
    ) => {
      if (isSettingShortcut) {
        return;
      }

      const target =
        e.target as HTMLElement | null;

      if (target) {
        const tagName =
          target.tagName.toLowerCase();

        if (
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      if (
        e.key === shortcutKey &&
        !e.repeat
      ) {
        e.preventDefault();

        if (
          !isPlaying &&
          Math.abs(
            totalProbability - 100
          ) <= 0.001
        ) {
          spinGacha();
        }
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    shortcutKey,
    isSettingShortcut,
    isPlaying,
    totalProbability,
    position,
    fontSize,
    rotation,
    results,
    rustleVolume,
    sparkleVolume,
    decisionVolume,
  ]);

  /*
   * ================================
   * ショートカット表示名
   * ================================
   */

  const getShortcutDisplayName = (
    key: string
  ) => {
    if (key === " ") {
      return "Space";
    }

    if (key === "Escape") {
      return "Esc";
    }

    if (key === "Enter") {
      return "Enter";
    }

    if (key === "Tab") {
      return "Tab";
    }

    if (key === "Backspace") {
      return "Backspace";
    }

    if (key === "ArrowUp") {
      return "↑";
    }

    if (key === "ArrowDown") {
      return "↓";
    }

    if (key === "ArrowLeft") {
      return "←";
    }

    if (key === "ArrowRight") {
      return "→";
    }

    return key;
  };

  /*
   * ================================
   * 動画時間監視
   * ================================
   */

  const handleTimeUpdate = () => {
    if (!videoRef.current) {
      return;
    }

    const remaining =
      videoRef.current.duration -
      videoRef.current.currentTime;

    if (
      remaining <= 1 &&
      remaining > 0 &&
      !showResult
    ) {
      setShowResult(true);
    }

    if (
      remaining <= 1 &&
      remaining > 0 &&
      !previewShowResult
    ) {
      setPreviewShowResult(
        true
      );
    }
  };

  /*
   * ================================
   * 操作画面動画終了
   *
   * 結果文字は消さずに残す
   * ================================
   */

  const handleVideoEnded = () => {
    setIsPlaying(false);

    /*
     * 操作画面では結果を残す。
     *
     * 以前あった
     *
     * setTimeout(() => {
     *   setShowResult(false);
     * }, 2000);
     *
     * は削除。
     */
    setShowResult(true);
  };

  /*
   * ================================
   * プレビュー動画終了
   * ================================
   */

  const handlePreviewEnded = () => {
    previewHideTimerRef.current =
      window.setTimeout(() => {
        setPreviewShowResult(
          false
        );

        setPreviewVisible(
          false
        );
      }, 2000);
  };

  /*
   * ================================
   * 結果名変更
   * ================================
   */

  const updateResultName = (
    id: number,
    name: string
  ) => {
    setResults((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              name,
            }
          : item
      )
    );
  };

  /*
   * ================================
   * 確率変更
   * ================================
   */

  const updateProbability = (
    id: number,
    probability: number
  ) => {
    setResults((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              probability:
                Math.max(
                  0,
                  probability
                ),
            }
          : item
      )
    );
  };

  /*
   * ================================
   * 結果追加
   * ================================
   */

  const addResult = () => {
    if (results.length >= 10) {
      return;
    }

    const newId =
      results.length === 0
        ? 1
        : Math.max(
            ...results.map(
              (item) => item.id
            )
          ) + 1;

    setResults([
      ...results,
      {
        id: newId,
        name: "新しい結果",
        probability: 0,
      },
    ]);
  };

  /*
   * ================================
   * 結果削除
   * ================================
   */

  const removeResult = (
    id: number
  ) => {
    if (results.length <= 1) {
      return;
    }

    setResults(
      results.filter(
        (item) =>
          item.id !== id
      )
    );
  };

  /*
   * ================================
   * 文字ドラッグ開始
   * ================================
   */

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.preventDefault();

    setDragging(true);
  };

  /*
   * ================================
   * 文字ドラッグ中
   * ================================
   */

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (
      !dragging ||
      !containerRef.current
    ) {
      return;
    }

    const rect =
      containerRef.current.getBoundingClientRect();

    const x =
      ((e.clientX - rect.left) /
        rect.width) *
      100;

    const y =
      ((e.clientY - rect.top) /
        rect.height) *
      100;

    setPosition({
      x: Math.max(
        0,
        Math.min(100, x)
      ),

      y: Math.max(
        0,
        Math.min(100, y)
      ),
    });
  };

  /*
   * ================================
   * ドラッグ終了
   * ================================
   */

  const handleMouseUp = () => {
    setDragging(false);
  };

  /*
   * ================================
   * 設定初期化
   * ================================
   */

  const resetSettings = () => {
    setPosition(
      DEFAULT_SETTINGS.position
    );

    setFontSize(
      DEFAULT_SETTINGS.fontSize
    );

    setRotation(
      DEFAULT_SETTINGS.rotation
    );

    setResults(
      DEFAULT_RESULTS
    );

    setRustleVolume(
      DEFAULT_SETTINGS.rustleVolume
    );

    setSparkleVolume(
      DEFAULT_SETTINGS.sparkleVolume
    );

    setDecisionVolume(
      DEFAULT_SETTINGS.decisionVolume
    );

    setShortcutKey(
      DEFAULT_SETTINGS.shortcutKey
    );
  };

  /*
   * ================================
   * Overlay URLコピー
   * ================================
   */

  const copyOverlayUrl = async () => {
    const overlayUrl =
      `${window.location.origin}/overlay`;

    try {
      await navigator.clipboard.writeText(
        overlayUrl
      );

      alert(
        "オーバーレイURLをコピーしました！"
      );
    } catch (error) {
      console.error(
        "URLのコピーに失敗しました。",
        error
      );

      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value =
        overlayUrl;

      textarea.style.position =
        "fixed";

      textarea.style.opacity =
        "0";

      document.body.appendChild(
        textarea
      );

      textarea.select();

      document.execCommand(
        "copy"
      );

      document.body.removeChild(
        textarea
      );

      alert(
        "オーバーレイURLをコピーしました！"
      );
    }
  };

  /*
   * ================================
   * 画面
   * ================================
   */

  return (
    <div className="app">

      <div className="screen-wrapper">

        {/* =================================
            操作画面
        ================================= */}

        <div className="screen-section">

          <h2>
            操作画面
          </h2>

          <div
            ref={containerRef}
            className="gacha-container"

            onMouseMove={
              handleMouseMove
            }

            onMouseUp={
              handleMouseUp
            }

            onMouseLeave={
              handleMouseUp
            }
          >

            <video
              ref={videoRef}

              className="gacha-video"

              src="/videos/gacha.mp4"

              onTimeUpdate={
                handleTimeUpdate
              }

              onEnded={
                handleVideoEnded
              }

              playsInline
            />

            <div
              className={`
                result-text
                ${
                  showResult
                    ? "visible"
                    : ""
                }
                ${
                  dragging
                    ? "dragging"
                    : ""
                }
              `}

              style={{
                left:
                  `${position.x}%`,

                top:
                  `${position.y}%`,

                fontSize:
                  `${fontSize}px`,

                transform:
                  `translate(-50%, -50%) ` +
                  `rotate(${rotation}deg)`,

                whiteSpace:
                  "pre-line",
              }}

              onMouseDown={
                handleMouseDown
              }
            >
              {result}
            </div>

          </div>

          {/* =========================
              ガチャ結果設定
          ========================== */}

          <div className="result-settings">

            <h3>
              ガチャ結果設定
            </h3>

            <div className="result-total">

              合計確率：
              <strong>
                {totalProbability}%
              </strong>

              {Math.abs(
                totalProbability - 100
              ) < 0.001 ? (
                <span className="probability-ok">
                  OK
                </span>
              ) : (
                <span className="probability-error">
                  100%にしてください
                </span>
              )}

            </div>

            {results.map(
              (item, index) => (
                <div
                  className="result-setting-row"
                  key={item.id}
                >

                  <span className="result-number">
                    {index + 1}
                  </span>

                  <textarea
                    className="result-name-input"
                    value={
                      item.name
                    }
                    onChange={(e) =>
                      updateResultName(
                        item.id,
                        e.target.value
                      )
                    }
                    placeholder="結果名"
                    rows={2}
                  />

                  <input
                    className="result-probability-input"

                    type="number"

                    min="0"

                    step="0.1"

                    value={
                      item.probability
                    }

                    onChange={(e) =>
                      updateProbability(
                        item.id,
                        Number(
                          e.target.value
                        )
                      )
                    }
                  />

                  <span className="percent-symbol">
                    %
                  </span>

                  <button
                    className="result-delete-button"

                    onClick={() =>
                      removeResult(
                        item.id
                      )
                    }

                    disabled={
                      results.length <=
                      1
                    }
                  >
                    削除
                  </button>

                </div>
              )
            )}

            <button
              className="result-add-button"

              onClick={
                addResult
              }

              disabled={
                results.length >= 10
              }
            >
              ＋ 結果を追加
            </button>

            <div className="result-count">
              {results.length}
              /10 個
            </div>

          </div>

          {/* =========================
              文字設定
          ========================== */}

          <div className="settings">

            <label>

              <span className="setting-label">
                文字サイズ：
              </span>

              <input
                type="range"

                min="16"

                max="150"

                value={fontSize}

                onChange={(e) =>
                  setFontSize(
                    Number(
                      e.target.value
                    )
                  )
                }
              />

              <span className="setting-value">
                {fontSize}px
              </span>

            </label>

            <label>

              <span className="setting-label">
                角度：
              </span>

              <input
                type="range"

                min="-180"

                max="180"

                value={rotation}

                onChange={(e) =>
                  setRotation(
                    Number(
                      e.target.value
                    )
                  )
                }
              />

              <span className="setting-value">
                {rotation}°
              </span>

            </label>

          </div>

          {/* =========================
              効果音設定
          ========================== */}

          <div className="settings sound-settings">

            <h3>
              効果音設定
            </h3>

            <label>

              <span className="setting-label">
                くじを漁る音：
              </span>

              <input
                type="range"

                min="0"

                max="100"

                step="1"

                value={
                  rustleVolume
                }

                onChange={(e) =>
                  setRustleVolume(
                    Number(
                      e.target.value
                    )
                  )
                }
              />

              <span className="setting-value">
                {rustleVolume}%
              </span>

            </label>

            <label>

              <span className="setting-label">
                ひらめき音：
              </span>

              <input
                type="range"

                min="0"

                max="100"

                step="1"

                value={
                  sparkleVolume
                }

                onChange={(e) =>
                  setSparkleVolume(
                    Number(
                      e.target.value
                    )
                  )
                }
              />

              <span className="setting-value">
                {sparkleVolume}%
              </span>

            </label>

            <label>

              <span className="setting-label">
                決定音：
              </span>

              <input
                type="range"

                min="0"

                max="100"

                step="1"

                value={
                  decisionVolume
                }

                onChange={(e) =>
                  setDecisionVolume(
                    Number(
                      e.target.value
                    )
                  )
                }
              />

              <span className="setting-value">
                {decisionVolume}%
              </span>

            </label>

            <button
              className="reset-button"

              onClick={
                resetSettings
              }
            >
              設定を初期化
            </button>

          </div>

          <div className="position-info">

            X:
            {" "}
            {position.x.toFixed(1)}
            %

            {"　"}

            Y:
            {" "}
            {position.y.toFixed(1)}
            %

          </div>

          {/* =========================
              ガチャボタン＋ショートカット
          ========================== */}

          <div
            className="gacha-control-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >

            <button
              className="gacha-button"

              onClick={
                spinGacha
              }

              disabled={
                isPlaying ||
                Math.abs(
                  totalProbability - 100
                ) > 0.001
              }
            >
              {
                isPlaying
                  ? "ガチャ演出中..."
                  : "ガチャを回す！"
              }
            </button>

            <div
              className="shortcut-setting"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >

              <span>
                ショートカット：
              </span>

              <span
                style={{
                  minWidth: "70px",
                  padding: "6px 10px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  textAlign: "center",
                  background:
                    isSettingShortcut
                      ? "#fff3cd"
                      : "#f5f5f5",
                }}
              >
                {
                  isSettingShortcut
                    ? "キーを押してください"
                    : getShortcutDisplayName(
                        shortcutKey
                      )
                }
              </span>

              <button
                type="button"
                onClick={() =>
                  setIsSettingShortcut(
                    true
                  )
                }
              >
                設定
              </button>

            </div>

          </div>

          {/* =========================
              Overlay URL
          ========================== */}

          <button
            className="overlay-copy-button"

            onClick={
              copyOverlayUrl
            }
          >
            オーバーレイURLをコピー
          </button>

        </div>

        {/* =================================
            配信用プレビュー
        ================================= */}

        <div className="screen-section">

          <h2>
            配信用画面
          </h2>

          <div className="preview-container">

            {previewVisible && (
              <>

                <video
                  ref={
                    previewVideoRef
                  }

                  className="preview-video"

                  src="/videos/gacha.mp4"

                  onEnded={
                    handlePreviewEnded
                  }

                  playsInline

                  muted
                />

                <div
                  className={`
                    preview-result
                    ${
                      previewShowResult
                        ? "visible"
                        : ""
                    }
                  `}

                  style={{
                    left:
                      `${position.x}%`,

                    top:
                      `${position.y}%`,

                    fontSize:
                      `${fontSize}px`,

                    transform:
                      `translate(-50%, -50%) ` +
                      `rotate(${rotation}deg)`,

                    whiteSpace:
                      "pre-line",
                  }}
                >
                  {result}
                </div>

              </>

            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default App;