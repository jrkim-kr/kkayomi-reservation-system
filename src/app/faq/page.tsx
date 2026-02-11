import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import FAQAccordion from "./FAQAccordion";

export default async function FAQPage() {
  const supabase = await createClient();
  const { data: faqs } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <h1 className="mb-6 text-center text-xl font-bold text-warm-gray-800">
        자주 묻는 질문
      </h1>

      <div className="space-y-3">
        {faqs && faqs.length > 0 ? (
          faqs.map((faq) => (
            <FAQAccordion
              key={faq.id}
              question={faq.question}
              answer={faq.answer}
            />
          ))
        ) : (
          <p className="text-center text-sm text-warm-gray-400">
            등록된 FAQ가 없습니다.
          </p>
        )}
      </div>

      <Link
        href="/"
        className="mt-8 block w-full rounded-lg border border-warm-gray-200 py-3 text-center text-sm font-medium text-warm-gray-600 transition-colors hover:bg-warm-gray-50"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
