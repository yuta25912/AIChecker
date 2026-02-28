class Plugin {
    constructor(workspace) {
        this.workspace = workspace;
        this.aiBtn = null;
        this.aiModal = null;
        this.engine = null;
        this.webllm = null;
        // 0.5Bは知能不足で嘘を吐くため、1.5Bにアップグレード
        this.selectedModel = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
        this.isLoaded = false;
        this.chatHistory = [];
        this.STORAGE_KEY = 'edbb_ai_checker_history';
    }

    async onload() {
        this.loadHistoryFromStorage();
        this.createAiButton();
        this.createAiModal();
        console.log("AIChecker (Smart 1.5B dev16) loaded!");
    }

    async onunload() {
        if (this.aiBtn) this.aiBtn.remove();
        if (this.aiModal) this.aiModal.remove();
        if (this.engine) { await this.engine.unload(); this.engine = null; }
        console.log("AIChecker Plugin unloaded.");
    }

    loadHistoryFromStorage() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) this.chatHistory = parsed;
            }
        } catch (e) { console.error(e); }
    }

    saveHistoryToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.chatHistory));
        } catch (e) { console.error(e); }
    }

    createAiButton() {
        const pluginBtn = document.getElementById('pluginBtn');
        if (!pluginBtn) return;
        const aiBtn = document.createElement('button');
        aiBtn.id = 'aiCheckerBtn';
        aiBtn.className = 'ml-2 group relative inline-flex items-center justify-center gap-2 px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200 transition-all duration-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-95 shadow-sm';
        aiBtn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4 text-indigo-500 transition-transform group-hover:rotate-12"></i><span class="hidden sm:inline">AIレビュー</span>`;
        pluginBtn.parentNode.insertBefore(aiBtn, pluginBtn);
        this.aiBtn = aiBtn;
        if (window.lucide) window.lucide.createIcons({ attrs: { class: 'lucide' }, nameAttr: 'data-lucide' });
        aiBtn.addEventListener('click', () => this.toggleAiModal(true));
    }

    parseMarkdown(text) {
        if (!text) return "";
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    createAiModal() {
        const oldModal = document.getElementById('aiModal');
        if (oldModal) oldModal.remove();

        const modalHtml = `
            <div id="aiModal" style="display: none; position: fixed; inset: 0; z-index: 999999 !important; align-items: center; justify-content: center; padding: 1rem; background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);">
                <div class="flex flex-col w-full max-w-2xl h-[80vh] overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ai-checker-modal-content" style="opacity: 1 !important; transform: scale(1) !important;">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                        <div class="flex items-center gap-3">
                            <div class="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"><i data-lucide="sparkles" class="w-5 h-5"></i></div>
                            <div>
                                <h2 class="text-lg font-bold text-slate-800 dark:text-white">AIChecker</h2>
                                <p class="text-xs text-slate-500 dark:text-slate-400">Qwen2.5 1.5B (High Quality) | dev16</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="aiDownloadBtn" title="履歴を保存 (.txt)" class="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:text-indigo-400 dark:hover:bg-slate-800"><i data-lucide="download" class="w-5 h-5"></i></button>
                            <button id="aiClearBtn" title="履歴を削除" class="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:text-red-400 dark:hover:bg-slate-800"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                            <button id="closeAiModalBtn" class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800"><i data-lucide="x" class="w-5 h-5"></i></button>
                        </div>
                    </div>
                    <div id="aiChatBody" class="flex-grow p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/50"></div>
                    <div id="aiLoadProgress" style="display: none;" class="px-6 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                        <div class="flex justify-between mb-1"><span id="aiProgressText" class="text-[10px] text-slate-500 dark:text-slate-400">AIを準備中...</span><span id="aiProgressPercent" class="text-[10px] font-bold text-indigo-500">0%</span></div>
                        <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden"><div id="aiProgressBar" class="bg-indigo-600 h-1.5 w-0"></div></div>
                    </div>
                    <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div class="flex gap-2">
                            <input id="aiChatInput" type="text" placeholder="質問を送ってね" class="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white">
                            <button id="aiSendBtn" class="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"><i data-lucide="send" class="w-5 h-5"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = modalHtml.trim();
        const modalElement = div.firstElementChild;
        document.body.appendChild(modalElement);
        this.aiModal = modalElement;
        if (window.lucide) window.lucide.createIcons({ attrs: { class: 'lucide' }, nameAttr: 'data-lucide', root: this.aiModal });
        document.getElementById('closeAiModalBtn').addEventListener('click', () => this.toggleAiModal(false));
        document.getElementById('aiSendBtn').addEventListener('click', () => this.handleSendMessage());
        document.getElementById('aiDownloadBtn').addEventListener('click', () => this.downloadHistory());
        document.getElementById('aiClearBtn').addEventListener('click', () => this.clearHistory());
        document.getElementById('aiChatInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleSendMessage(); });
        this.aiModal.addEventListener('click', (e) => { if (e.target === this.aiModal) this.toggleAiModal(false); });
        this.renderHistory();
    }

    renderHistory() {
        const chatBody = document.getElementById('aiChatBody');
        chatBody.innerHTML = '';
        if (this.chatHistory.length === 0) {
            this.addMessageToUI('bot', 'こんにちは！EDBB専用の AI アシスタントです！😊\n少し賢いモデル(1.5B)にアップグレードしました！ブロックの作り方など、何でも聞いてね！');
        } else {
            this.chatHistory.forEach(msg => this.addMessageToUI(msg.role, msg.content));
        }
    }

    toggleAiModal(show) {
        if (!this.aiModal || !document.getElementById('aiModal')) this.createAiModal();
        if (show) { this.aiModal.style.setProperty('display', 'flex', 'important'); this.renderHistory(); }
        else { this.aiModal.style.setProperty('display', 'none', 'important'); }
    }

    async loadWebLLM() {
        if (this.webllm) return this.webllm;
        const module = await import("https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm");
        this.webllm = module;
        return module;
    }

    getAvailableBlocks() {
        return "論理, ループ, 算術, テキスト, リスト, 変数, 関数, Discord(Bot, Message, Interaction)";
    }

    logDetectedTopic(text) {
        const topics = {
            "バグ": ["動かない", "エラー", "バグ", "変", "おかしい", "ミス", "固まる"],
            "Discord設定": ["メッセージ", "コマンド", "送信", "チャンネル", "名前", "メンション"],
            "設計相談": ["どうすれば", "作り方", "方法", "構成", "設計"],
            "用語解説": ["とは", "意味", "何", "教えて", "って", "について"],
            "使い方": ["使い方", "どう使う", "やり方", "どうやって", "どうやってやる", "どうやったら"]
        };
        for (const [topic, keywords] of Object.entries(topics)) {
            if (keywords.some(kw => text.includes(kw))) {
                console.log(`[AIChecker Debug] Detected Topic: ${topic}`);
                return;
            }
        }
        console.log(`[AIChecker Debug] Topic: General Inquiry`);
    }

    async handleSendMessage() {
        const input = document.getElementById('aiChatInput');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';

        this.logDetectedTopic(text);
        this.addChatMessage('user', text);

        try {
            if (!this.engine) await this.initEngine();
            if (!this.isLoaded) return;

            let code = "コードがありません。";
            if (typeof Blockly !== 'undefined' && this.workspace) {
                try { if (Blockly.Python) code = Blockly.Python.workspaceToCode(this.workspace); } catch(e) {}
            }

            const blocks = this.getAvailableBlocks();
            const systemPrompt = `あなたはEDBB(Discord Bot作成ツール)の先生です。
必ず日本語のみで、自然な言葉遣いで答えてください。作り話やパニックによる変な用語の使用は厳禁です。

【重要】
1. 回答にPythonコードを直接書かないでください。ユーザーはブロックで作成しています。
2. 指示は「『${blocks}』カテゴリの中にある『〇〇』というブロックを使い、そこに『△△』を繋げてください」のように、具体的なブロック名を挙げて説明してください。
3. 専門用語（引数など）の意味を聞かれたら、初心者にも分かるように優しく解説してください。
4. 常に「ブロックエディタでの操作」を前提とした回答を心がけてください。

現在のコード(Python):
\`\`\`python
${code}
\`\`\`
ユーザーがチャットした意図を汲み取り、ブロックでの作り方を分かりやすく教えてください。`;

            const loadingId = this.addMessageToUI('bot', '...', true);
            const messages = [
                { role: "system", content: systemPrompt },
                ...this.chatHistory.slice(-5).map(m => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.content })),
                { role: "user", content: text }
            ];

            // 1.5B なら temperature 0.4 程度で安定します
            const chunks = await this.engine.chat.completions.create({ messages, temperature: 0.4, stream: true });
            let fullText = "";
            for await (const chunk of chunks) {
                fullText += chunk.choices[0]?.delta?.content || "";
                this.updateChatMessageUI(loadingId, fullText);
            }
            this.addChatMessage('bot', fullText, false, true);
        } catch (error) { this.addMessageToUI('bot', 'エラー: ' + error.message); }
    }

    async initEngine() {
        const pContainer = document.getElementById('aiLoadProgress');
        try {
            const webllm = await this.loadWebLLM();
            pContainer.style.display = 'block';
            this.engine = new webllm.MLCEngine();
            this.engine.setInitProgressCallback((report) => {
                const progress = Math.round(report.progress * 100);
                document.getElementById('aiProgressBar').style.width = progress + '%';
                document.getElementById('aiProgressPercent').innerText = progress + '%';
                document.getElementById('aiProgressText').innerText = report.text;
            });
            await this.engine.reload(this.selectedModel);
            this.isLoaded = true;
            pContainer.style.display = 'none';
        } catch (e) { this.addMessageToUI('bot', '初期化エラー: ' + e.message); pContainer.style.display = 'none'; }
    }

    addChatMessage(role, content, isInit = false, isFinalBotResponse = false) {
        if (!isInit && !isFinalBotResponse) { this.chatHistory.push({ role, content }); this.saveHistoryToStorage(); this.addMessageToUI(role, content); }
        else if (isFinalBotResponse) { this.chatHistory.push({ role, content }); this.saveHistoryToStorage(); }
    }

    addMessageToUI(role, text, isLoading = false) {
        const chatBody = document.getElementById('aiChatBody');
        const msgDiv = document.createElement('div');
        msgDiv.className = `flex ${role === 'user' ? 'justify-end' : 'items-start'} gap-3`;
        const id = 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5);
        msgDiv.id = id;
        const avatarHtml = role === 'bot' ? `<div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0"><i data-lucide="sparkles" class="w-5 h-5 text-white"></i></div>` : '';
        const contentClass = role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700';

        const htmlContent = this.parseMarkdown(text);
        msgDiv.innerHTML = `${avatarHtml}<div class="p-4 rounded-2xl ${contentClass} shadow-sm max-w-[85%]"><p class="text-sm">${htmlContent}</p></div>`;
        
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
        if (window.lucide && role === 'bot') window.lucide.createIcons({ attrs: { class: 'lucide' }, nameAttr: 'data-lucide', root: msgDiv });
        return id;
    }

    updateChatMessageUI(id, text) {
        const msgDiv = document.getElementById(id);
        if (msgDiv) {
            const p = msgDiv.querySelector('p');
            if (p) p.innerHTML = this.parseMarkdown(text);
            const chatBody = document.getElementById('aiChatBody');
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    }

    clearHistory() {
        if (confirm("チャット履歴を消してもいいですか？")) { this.chatHistory = []; localStorage.removeItem(this.STORAGE_KEY); this.renderHistory(); }
    }

    downloadHistory() {
        if (this.chatHistory.length === 0) return alert("履歴がありません！！");
        const content = this.chatHistory.map(m => `[${m.role === 'user' ? 'あなた' : 'AI'}]\n${m.content}\n`).join('\n---\n\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai_checker_history.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
