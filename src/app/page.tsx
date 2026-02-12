import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Settings loader
// ---------------------------------------------------------------------------

interface PublicSettings {
  store_name?: string;
  store_description?: string;
  booking_button_label?: string;
  workshop_address?: string;
  instagram_handle?: string;
  kakao_channel_id?: string;
}

async function getPublicSettings(): Promise<PublicSettings> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["store_name", "store_description", "booking_button_label", "workshop_address", "instagram_handle", "kakao_channel_id"]);

  const settings: PublicSettings = {};
  for (const item of data ?? []) {
    (settings as Record<string, unknown>)[item.key] = item.value;
  }
  return settings;
}

// ---------------------------------------------------------------------------
// Icons (inline SVG)
// ---------------------------------------------------------------------------

function MapPinIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  );
}

function InstagramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
    </svg>
  );
}

function KakaoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.725 1.794 5.116 4.508 6.482-.144.522-.926 3.36-.962 3.585 0 0-.02.163.086.225.105.063.229.03.229.03.302-.042 3.502-2.286 4.055-2.674.678.096 1.38.147 2.084.147 5.523 0 10-3.463 10-7.795C22 6.463 17.523 3 12 3Z" />
    </svg>
  );
}

function QuestionIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
      />
    </svg>
  );
}

function CalendarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
      />
    </svg>
  );
}

function UserIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const settings = await getPublicSettings();

  const instagramUrl = settings.instagram_handle
    ? `https://www.instagram.com/${settings.instagram_handle.replace(/^@/, "")}`
    : null;

  const kakaoUrl = settings.kakao_channel_id
    ? `https://pf.kakao.com/${settings.kakao_channel_id}`
    : null;

  const hasSns = instagramUrl || kakaoUrl;

  const storeName = settings.store_name || "예약 시스템";
  const storeDescription = settings.store_description || "간편하게 예약하세요";
  const bookingButtonLabel = settings.booking_button_label || "예약하기";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-5">
        {/* ---- Hero ---- */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-warm-gray-800">
            {storeName}
          </h1>
          <p className="mt-2 text-sm text-warm-gray-400">
            {storeDescription}
          </p>
        </div>

        {/* ---- CTA Buttons ---- */}
        <div className="flex flex-col gap-2.5">
          <Link
            href="/booking"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
          >
            <CalendarIcon className="h-5 w-5" />
            {bookingButtonLabel}
          </Link>
          {user ? (
            <Link
              href="/mypage"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-warm-gray-200 bg-white px-6 py-3 text-base font-medium text-warm-gray-600 transition-colors hover:bg-warm-gray-50"
            >
              <UserIcon className="h-5 w-5" />
              마이페이지
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-warm-gray-200 bg-white px-6 py-3 text-base font-medium text-warm-gray-600 transition-colors hover:bg-warm-gray-50"
            >
              <UserIcon className="h-5 w-5" />
              로그인
            </Link>
          )}
          <Link
            href="/faq"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-warm-gray-200 bg-white px-6 py-3 text-base font-medium text-warm-gray-600 transition-colors hover:bg-warm-gray-50"
          >
            <QuestionIcon className="h-5 w-5" />
            자주 묻는 질문
          </Link>
        </div>

        {/* ---- 공방 정보 ---- */}
        {settings.workshop_address && (
          <div className="rounded-xl border border-warm-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                <MapPinIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-warm-gray-400">
                  오시는 길
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-warm-gray-700">
                  {settings.workshop_address}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ---- SNS ---- */}
        {hasSns && (
          <div className="flex items-center justify-center gap-3">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-warm-gray-100 bg-white px-4 py-2 text-sm font-medium text-warm-gray-600 shadow-sm transition-colors hover:border-primary-200 hover:text-primary-500"
              >
                <InstagramIcon className="h-4 w-4" />
                Instagram
              </a>
            )}
            {kakaoUrl && (
              <a
                href={kakaoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-warm-gray-100 bg-white px-4 py-2 text-sm font-medium text-warm-gray-600 shadow-sm transition-colors hover:border-yellow-300 hover:text-yellow-600"
              >
                <KakaoIcon className="h-4 w-4" />
                카카오톡
              </a>
            )}
          </div>
        )}

        {/* ---- Footer ---- */}
        <p className="text-center text-xs text-warm-gray-300">
          &copy; {storeName}
        </p>
      </div>
    </div>
  );
}
