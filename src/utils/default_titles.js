// デフォルトの置換対象となる科目名リスト（ゼミ等）
const DEFAULT_SUBJECT_TITLES = {
    course_6346325: "岡嶋ゼミ",
    course_6414125: "角田ゼミ",
    course_6346328: "小花ゼミ",
    course_6346337: "篠﨑ゼミ",
    course_6346346: "橋本ゼミ",
    course_6346352: "松崎ゼミ",
    course_6346316: "飯尾ゼミ",
    course_6346361: "吉田ゼミ",
    course_6346334: "斎藤ゼミ",
    course_6346319: "石井ゼミ",
    course_6346322: "岩隈ゼミ",
    course_6346331: "小向ゼミ",
    course_6346340: "中島ゼミ",
    course_6346343: "中村ゼミ",
    course_6346349: "平野ゼミ",
    course_6346355: "村田ゼミ",
    course_6346358: "矢島ゼミ",
    course_6351261: "渡部ゼミ"
};

// グローバルスコープに公開
if (typeof window !== "undefined") {
    window.DEFAULT_SUBJECT_TITLES = DEFAULT_SUBJECT_TITLES;
}
if (typeof globalThis !== "undefined") {
    globalThis.DEFAULT_SUBJECT_TITLES = DEFAULT_SUBJECT_TITLES;
}
