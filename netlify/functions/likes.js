// 좋아요 기능 - 서버 함수 (Netlify Functions + Supabase)
// GET  /api/likes  -> 누적 좋아요 수 반환
// POST /api/likes  -> 좋아요 1건 저장 (한 건씩 저장해서 집계)

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return jsonResponse(500, {
      error: "서버 환경 변수(SUPABASE_URL, SUPABASE_SECRET_KEY)가 설정되지 않았습니다.",
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

  // 1) 누적 좋아요 수 읽기
  if (event.httpMethod === "GET") {
    const { count, error } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true });

    if (error) {
      return jsonResponse(500, { error: "좋아요 수를 불러오지 못했습니다." });
    }

    return jsonResponse(200, { count: count || 0 });
  }

  // 2) 좋아요 1건 저장
  if (event.httpMethod === "POST") {
    const { error } = await supabase.from("likes").insert({});

    if (error) {
      return jsonResponse(500, { error: "좋아요를 저장하지 못했습니다." });
    }

    // 저장 후 최신 집계를 함께 반환
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true });

    return jsonResponse(200, { ok: true, count: count || 0 });
  }

  return jsonResponse(405, { error: "지원하지 않는 요청 방식입니다." });
};
