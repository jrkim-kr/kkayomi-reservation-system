import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createAdminClient();

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

  const { id } = await params;
  const body = await request.json();
  const { question, answer, sort_order, is_active } = body;

  // 기존 FAQ 확인
  const { data: existing, error: findError } = await supabase
    .from("faqs")
    .select("id")
    .eq("id", id)
    .single();

  if (findError || !existing) {
    return NextResponse.json(
      { error: "FAQ를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 업데이트할 필드 구성
  const updateData: Record<string, unknown> = {};

  if (question !== undefined) {
    if (!question.trim()) {
      return NextResponse.json(
        { error: "질문은 비워둘 수 없습니다." },
        { status: 400 }
      );
    }
    updateData.question = question.trim();
  }

  if (answer !== undefined) {
    if (!answer.trim()) {
      return NextResponse.json(
        { error: "답변은 비워둘 수 없습니다." },
        { status: 400 }
      );
    }
    updateData.answer = answer.trim();
  }

  if (sort_order !== undefined) {
    updateData.sort_order = sort_order;
  }

  if (is_active !== undefined) {
    updateData.is_active = is_active;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "변경할 내용이 없습니다." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("faqs")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "FAQ 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createAdminClient();

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

  const { id } = await params;

  // 기존 FAQ 확인
  const { data: existing, error: findError } = await supabase
    .from("faqs")
    .select("id")
    .eq("id", id)
    .single();

  if (findError || !existing) {
    return NextResponse.json(
      { error: "FAQ를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const { error } = await supabase.from("faqs").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "FAQ 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
