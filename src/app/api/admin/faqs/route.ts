import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "FAQ 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { question, answer, sort_order, is_active } = body;

  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json(
      { error: "질문과 답변은 필수 입력 항목입니다." },
      { status: 400 }
    );
  }

  // sort_order가 지정되지 않은 경우 현재 최대값 + 1
  let finalSortOrder = sort_order;
  if (finalSortOrder === undefined || finalSortOrder === null) {
    const { data: maxRow } = await supabase
      .from("faqs")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    finalSortOrder = maxRow ? maxRow.sort_order + 1 : 1;
  }

  const { data, error } = await supabase
    .from("faqs")
    .insert({
      question: question.trim(),
      answer: answer.trim(),
      sort_order: finalSortOrder,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "FAQ 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
