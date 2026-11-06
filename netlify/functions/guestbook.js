// 짧은 방명록 - 서버 함수 (Netlify Functions + Supabase)
// GET  /api/guestbook                        -> 최근 글 목록 반환 (최신순, 최대 50건)
// POST /api/guestbook {nickname, message}    -> 검증 후 글 1건 저장

const { createClient } = require("@supabase/supabase-js");

// 환경 변수에서 Supabase 연결 정보를 읽는다. (키 값은 코드에 넣지 않는다)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

// 입력 길이 제한 (브라우저와 서버 양쪽에서 동일하게 검사)
const NICK_MIN = 2;
const NICK_MAX = 12;
const MSG_MIN = 1;
const MSG_MAX = 100;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  // 환경 변수가 없으면 서버 설정 문제임을 알린다. (성공으로 위장하지 않음)
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return jsonResponse(500, {
      error: "서버 환경 변수(SUPABASE_URL, SUPABASE_SECRET_KEY)가 설정되지 않았습니다.",
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

  // 1) 최근 글 목록 읽기
  if (event.httpMethod === "GET") {
    const { data, error } = await supabase
      .from("guestbook_entries")
      .select("id, nickname, message, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return jsonResponse(500, { error: "방명록을 불러오지 못했습니다." });
    }

    return jsonResponse(200, { entries: data });
  }

  // 2) 글 저장하기
  if (event.httpMethod === "POST") {
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      return jsonResponse(400, { error: "요청 형식이 올바르지 않습니다." });
    }

    // 문자열 정리 (앞뒤 공백 제거)
    const nickname = typeof payload.nickname === "string" ? payload.nickname.trim() : "";
    const message = typeof payload.message === "string" ? payload.message.trim() : "";

    // 서버에서 값 검증 (브라우저 검사를 믿지 않고 서버가 다시 확인)
    if (nickname.length < NICK_MIN || nickname.length > NICK_MAX) {
      return jsonResponse(400, { error: `별명은 ${NICK_MIN}~${NICK_MAX}자여야 합니다.` });
    }
    if (message.length < MSG_MIN || message.length > MSG_MAX) {
      return jsonResponse(400, { error: `메시지는 ${MSG_MIN}~${MSG_MAX}자여야 합니다.` });
    }

    // 입력은 글자 그대로 저장한다. (표시할 때 HTML로 실행하지 않도록 화면에서 textContent 사용)
    const { error } = await supabase
      .from("guestbook_entries")
      .insert({ nickname, message });

    if (error) {
      return jsonResponse(500, { error: "방명록을 저장하지 못했습니다." });
    }

    return jsonResponse(200, { ok: true });
  }

  return jsonResponse(405, { error: "지원하지 않는 요청 방식입니다." });
};
