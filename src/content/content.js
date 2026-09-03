(() => {
    // デフォルト設定
    const DEFAULT_SETTINGS = {
        enabled: true,
        themeMode: "system",
        autoLogin: true,
        enhanceForms: true,
        highlightNegativeWords: true,
        highlightWords: "誤っている\n誤り\n間違っている\n間違い",
        enableReplacements: true,
        replacements: {},
        renameTabTitle: true,
        removeSaturday: true,
        enableSubjectTitles: true,
        subjectTitles: {},
        addSyllabusLink: true,
        customCss: ""
    };

    let currentSettings = { ...DEFAULT_SETTINGS };
    let customStyleEl = null;
    let selectionMode = false;
    let observer = null;

    // 設定取得ヘルパー
    function fetchSettings(callback) {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
            if (chrome.runtime.lastError) {
                chrome.storage.local.get(DEFAULT_SETTINGS, (localItems) => {
                    callback({ ...DEFAULT_SETTINGS, ...localItems });
                });
            } else {
                callback({ ...DEFAULT_SETTINGS, ...items });
            }
        });
    }

    // 1. CSSクラスとカスタムCSSの適用
    function applyStyles() {
        const root = document.documentElement;

        if (!currentSettings.enabled) {
            root.classList.remove(
                "manaba-enhance-forms",
                "manaba-remove-saturday"
            );
            if (customStyleEl) customStyleEl.textContent = "";
            return;
        }

        root.classList.toggle(
            "manaba-enhance-forms",
            Boolean(currentSettings.enhanceForms)
        );
        root.classList.toggle(
            "manaba-remove-saturday",
            Boolean(currentSettings.removeSaturday)
        );

        // カスタムCSSの反映
        if (!customStyleEl) {
            customStyleEl = document.createElement("style");
            customStyleEl.id = "manaba-customizer-user-css";
            (document.head || root).appendChild(customStyleEl);
        }
        customStyleEl.textContent = currentSettings.customCss || "";
    }

    // 2. わかりやすいタブタイトル
    function applyTabRename() {
        if (!currentSettings.enabled || !currentSettings.renameTabTitle) return;

        let courseEl =
            document.querySelector("a#coursename") ||
            document.querySelector("h1") ||
            document.querySelector("h2");

        if (courseEl && courseEl.textContent) {
            let title = courseEl.textContent.trim();
            if (location.href.includes("ct/syllabus")) {
                title += " シラバス";
            }
            if (title && !document.title.includes(title)) {
                document.title = `${title} - manaba`;
            }
        }
    }

    // 3. 誤答選択問題の強調表示
    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function applyNegativeHighlight(rootNode = document.body) {
        if (
            !currentSettings.enabled ||
            !currentSettings.highlightNegativeWords ||
            !rootNode
        )
            return;

        const words = (currentSettings.highlightWords || "")
            .split("\n")
            .map((w) => w.trim())
            .filter(Boolean);

        if (words.length === 0) return;

        const regex = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "g");

        function walk(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue;
                if (!text || !text.trim()) return;

                // 既にハイライトされた要素内はスキップ
                if (
                    node.parentElement &&
                    node.parentElement.classList.contains(
                        "manaba-customizer-highlight"
                    )
                ) {
                    return;
                }

                if (regex.test(text)) {
                    const span = document.createElement("span");
                    span.innerHTML = text.replace(
                        regex,
                        '<span class="manaba-customizer-highlight">$1</span>'
                    );
                    node.parentNode?.replaceChild(span, node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toUpperCase();
                const ignoreTags = [
                    "SCRIPT",
                    "STYLE",
                    "NOSCRIPT",
                    "TEXTAREA",
                    "INPUT",
                    "SELECT"
                ];
                if (ignoreTags.includes(tag)) return;

                Array.from(node.childNodes).forEach(walk);
            }
        }

        walk(rootNode);
    }

    // 4. 任意文字列の置換
    function applyReplacements(rootNode = document.body) {
        if (
            !currentSettings.enabled ||
            !currentSettings.enableReplacements ||
            !rootNode
        )
            return;

        const rules = currentSettings.replacements || {};
        const entries = Object.entries(rules).filter(([from]) => Boolean(from));
        if (entries.length === 0) return;

        function walk(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                let text = node.nodeValue;
                let changed = false;
                for (const [from, to] of entries) {
                    if (text.includes(from)) {
                        text = text.replaceAll(from, to);
                        changed = true;
                    }
                }
                if (changed) {
                    node.nodeValue = text;
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toUpperCase();
                const ignoreTags = [
                    "SCRIPT",
                    "STYLE",
                    "NOSCRIPT",
                    "TEXTAREA",
                    "INPUT",
                    "SELECT"
                ];
                if (ignoreTags.includes(tag)) return;

                Array.from(node.childNodes).forEach(walk);
            }
        }

        walk(rootNode);
    }

    // 5. 科目名のカスタム表示
    function isValidSubjectLink(link) {
        if (link.querySelector("img") !== null) return false;
        if (link.textContent.trim() === "") return false;
        return true;
    }

    function applySubjectTitles() {
        if (!currentSettings.enabled || !currentSettings.enableSubjectTitles)
            return;

        const defaultTitles =
            typeof DEFAULT_SUBJECT_TITLES !== "undefined"
                ? DEFAULT_SUBJECT_TITLES
                : window.DEFAULT_SUBJECT_TITLES || {};
        const userTitles = currentSettings.subjectTitles || {};
        const mergedTitles = { ...defaultTitles, ...userTitles };

        const links = document.querySelectorAll(
            "a:not(.courseweekly-fav):not(.courselist-fav)"
        );
        links.forEach((link) => {
            if (!isValidSubjectLink(link)) return;

            const href = link.getAttribute("href");
            if (!href) return;

            const courseMatch = href.match(/course_\d+(?=$|[/?#])/);
            const key = courseMatch ? courseMatch[0] : href;

            if (
                mergedTitles[key] &&
                link.textContent.trim() !== mergedTitles[key]
            ) {
                link.textContent = mergedTitles[key];
            }
        });
    }

    // 6. シラバス検索リンクの追加
    function applySyllabusLink() {
        const existingLink = document.querySelector(".manaba-syllabus-link");

        if (!currentSettings.enabled || !currentSettings.addSyllabusLink) {
            if (existingLink) existingLink.remove();
            return;
        }

        // コースページ以外では処理を行わない
        if (!location.pathname.includes("/ct/course_")) return;

        // コース名コンテナの取得
        const courseNameContainer =
            document.querySelector(
                "#container > div.pagebody > div > div.pageheader-course.pageheader-courseV2 > div > div.pageheader-course-coursename"
            ) || document.querySelector("div.pageheader-course-coursename");

        if (!courseNameContainer) return;

        // 担当教員名要素の取得
        const teacherEl =
            document.querySelector(
                "#container > div.pagebody > div > div.pageheader-course.pageheader-courseV2 > div > div.pageheader-course-courseteacher > span.courseteacher-name > span"
            ) ||
            document.querySelector(
                "div.pageheader-course-courseteacher span.courseteacher-name > span"
            );

        // 講義名の抽出（シラバスリンク自身は除外）
        function extractCourseName(container) {
            const courseA = container.querySelector("a#coursename");
            if (courseA) {
                return courseA.textContent.trim();
            }
            const clone = container.cloneNode(true);
            const linkInClone = clone.querySelector(".manaba-syllabus-link");
            if (linkInClone) linkInClone.remove();
            return clone.textContent.trim();
        }

        const courseName = extractCourseName(courseNameContainer);
        const teacherName = teacherEl ? teacherEl.textContent.trim() : "";

        function createSyllabusUrl(cName, tName) {
            const params = new URLSearchParams({
                search: "search",
                ranking: "ranking",
                ju_kamoku: cName,
                ju_kyouin: tName,
                kana: "",
                k_code: "",
                gakki: "",
                free_word: ""
            });
            return `https://syllabus.chuo-u.ac.jp/syllabus/conditions-result/?${params.toString()}`;
        }

        const targetUrl = createSyllabusUrl(courseName, teacherName);

        // コースコード要素（.coursecode）があればその右隣に追加、なければコース名コンテナに追加
        const courseCodeEl = courseNameContainer.querySelector(".coursecode");
        const targetParent = courseCodeEl || courseNameContainer;

        if (existingLink) {
            if (existingLink.href !== targetUrl) {
                existingLink.href = targetUrl;
            }
            if (existingLink.parentElement !== targetParent) {
                targetParent.appendChild(existingLink);
            }
            return;
        }

        const link = document.createElement("a");
        link.className = "manaba-syllabus-link";
        link.textContent = "シラバス検索";
        link.href = targetUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.title = "シラバス検索を開く";

        link.addEventListener("click", () => {
            const latestCourse = extractCourseName(courseNameContainer);
            const latestTeacherEl =
                document.querySelector(
                    "#container > div.pagebody > div > div.pageheader-course.pageheader-courseV2 > div > div.pageheader-course-courseteacher > span.courseteacher-name > span"
                ) ||
                document.querySelector(
                    "div.pageheader-course-courseteacher span.courseteacher-name > span"
                );
            const latestTeacher = latestTeacherEl
                ? latestTeacherEl.textContent.trim()
                : "";
            link.href = createSyllabusUrl(latestCourse, latestTeacher);
        });

        targetParent.appendChild(link);
    }

    // すべての動的変更を適用
    function applyAll() {
        applyStyles();
        applyTabRename();
        if (document.body) {
            applySubjectTitles();
            applyReplacements(document.body);
            applyNegativeHighlight(document.body);
            applySyllabusLink();
        }
    }

    // 初期化
    fetchSettings((settings) => {
        currentSettings = settings;
        applyAll();

        // ページロード完了時の再実行
        if (document.readyState !== "complete") {
            window.addEventListener("DOMContentLoaded", applyAll);
            window.addEventListener("load", applyAll);
        }

        // DOM変更の監視
        if (!observer && document.body) {
            observer = new MutationObserver(() => {
                applyTabRename();
                applySubjectTitles();
                applyReplacements(document.body);
                applyNegativeHighlight(document.body);
                applySyllabusLink();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });

    // ストレージ変更のリアルタイム検知
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "sync" || areaName === "local") {
            fetchSettings((newSettings) => {
                currentSettings = newSettings;
                applyAll();
            });
        }
    });

    // メッセージ受信（科目名直接編集モード）
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "enterSelectionMode") {
            selectionMode = true;
            document.body.style.cursor = "crosshair";
            if (typeof window.showToast === "function") {
                window.showToast(
                    "科目名編集モード: 変更したい科目を直接クリックしてください",
                    "info",
                    4000
                );
            }
            sendResponse({ ok: true });
        }
    });

    // 科目名編集モードのホバー & クリックイベント
    document.addEventListener("mouseover", (e) => {
        if (!selectionMode) return;
        const link = e.target.closest(
            "a:not(.courseweekly-fav):not(.courselist-fav)"
        );
        if (link && isValidSubjectLink(link)) {
            link.classList.add("manaba-edit-subject-hover");
        }
    });

    document.addEventListener("mouseout", (e) => {
        if (!selectionMode) return;
        const link = e.target.closest(
            "a:not(.courseweekly-fav):not(.courselist-fav)"
        );
        if (link && isValidSubjectLink(link)) {
            link.classList.remove("manaba-edit-subject-hover");
        }
    });

    document.addEventListener(
        "click",
        (e) => {
            if (!selectionMode) return;

            const link = e.target.closest(
                "a:not(.courseweekly-fav):not(.courselist-fav)"
            );
            if (link && isValidSubjectLink(link)) {
                e.preventDefault();
                e.stopPropagation();

                link.classList.remove("manaba-edit-subject-hover");
                const href = link.getAttribute("href");

                if (href) {
                    const courseMatch = href.match(/course_\d+(?=$|[/?#])/);
                    const key = courseMatch ? courseMatch[0] : href;
                    const currentName = link.textContent.trim();

                    const newName = prompt(
                        `新しい科目名を入力してください（空欄にすると初期設定に戻ります）:\n\n現在の表示: ${currentName}`,
                        currentName
                    );

                    if (newName !== null) {
                        fetchSettings((settings) => {
                            const updatedTitles = {
                                ...(settings.subjectTitles || {})
                            };
                            if (newName.trim() === "") {
                                delete updatedTitles[key];
                                if (typeof window.showToast === "function") {
                                    window.showToast(
                                        "科目名のカスタム設定を解除しました",
                                        "warning",
                                        3000
                                    );
                                }
                            } else {
                                updatedTitles[key] = newName.trim();
                                if (typeof window.showToast === "function") {
                                    window.showToast(
                                        `科目名を「${newName.trim()}」に変更しました`,
                                        "success",
                                        3000
                                    );
                                }
                            }

                            chrome.storage.sync.set(
                                { subjectTitles: updatedTitles },
                                () => {
                                    if (chrome.runtime.lastError) {
                                        chrome.storage.local.set({
                                            subjectTitles: updatedTitles
                                        });
                                    }
                                }
                            );
                        });
                    }
                }

                selectionMode = false;
                document.body.style.cursor = "";
            } else {
                selectionMode = false;
                document.body.style.cursor = "";
                if (typeof window.showToast === "function") {
                    window.showToast(
                        "科目名編集モードを終了しました",
                        "info",
                        2000
                    );
                }
            }
        },
        true
    );
})();
