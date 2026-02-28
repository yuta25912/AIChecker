class Plugin {
    constructor(workspace) {
        this.workspace = workspace;
        this.aiBtn = null;
        this.aiModal = null;
        this.engine = null;
        this.webllm = null;
        // Alibaba提供の超軽量モデル (約400MB)
        this.selectedModel = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
        this.isLoaded = false;
        this.chatHistory = [];
        this.STORAGE_KEY = 'edbb_ai_checker_history';
    }

    async onload() {
        this.loadHistoryFromStorage();
        this.createAiButton();
        this.createAiModal();
        console.log("AIChecker (Lightweight dev10-final) loaded!");
    }

    async onunload() {
        if (this.aiBtn) this.aiBtn.remove();
        if (this.aiModal) this.aiModal.remove();
        if (this.engine) {
            await this.engine.unload();
            this.engine = null;
        }
        console.log("AIChecker Plugin unloaded.");
    }

    // 履歴を localStorage から読み込む
    loadHistoryFromStorage() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.chatHistory = JSON.parse(saved);
            }
        } catch (e) {
            console.error("Failed to load history:", e);
        }
    }

    // 履歴を保存する
    saveHistoryToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.chatHistory));
        } catch (e) {
            console.error("Failed to save history:", e);
        }
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

    createAiModal() {
        const oldModal = document.getElementById('aiModal');
        if (oldModal) oldModal.remove();

        const modalHtml = `
            <div id="aiModal" style="display: none; position: fixed; inset: 0; z-index: 999999 !important; align-items: center; justify-content: center; padding: 1rem; background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);">
                <div class="flex flex-col w-full max-w-2xl h-[80vh] overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ai-checker-modal-content" style="opacity: 1 !important; transform: scale(1) !important;">
                    <!-- Header -->
                    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                        <div class="flex items-center gap-3">
                            <div class="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                <i data-lucide="message-square" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h2 class="text-lg font-bold text-slate-800 dark:text-white">AIChecker (Light)</h2>
                                <p class="text-xs text-slate-500 dark:text-slate-400">Qwen2.5 0.5B (Alibaba)</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="aiDownloadBtn" title="履歴を保存 (.txt)" class="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:text-indigo-400 dark:hover:bg-slate-800">
                                <i data-lucide="download" class="w-5 h-5"></i>
                            </button>
                            <button id="aiClearBtn" title="履歴を削除" class="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:text-red-400 dark:hover:bg-slate-800">
                                <i data-lucide="trash-2" class="w-5 h-5"></i>
                            </button>
                            <button id="closeAiModalBtn" class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800">
                                <i data-lucide="x" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Chat Body -->
                    <div id="aiChatBody" class="flex-grow p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
                        <!-- Messages go here -->
                    </div>

                    <!-- Progress Bar -->
                    <div id="aiLoadProgress" style="display: none;" class="px-6 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                        <div class="flex justify-between mb-1">
                            <span id="aiProgressText" class="text-[10px] text-slate-500 dark:text-slate-400">Loading model...</span>
                            <span id="aiProgressPercent" class="text-[10px] font-bold text-indigo-500">0%</span>
                        </div>
                        <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div id="aiProgressBar" class="bg-indigo-600 h-1.5 w-0 transition-all duration-300"></div>
                        </div>
                    </div>

                    <!-- Input Footer -->
                    <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div class="flex gap-2">
                            <input id="aiChatInput" type="text" placeholder="Discord Botの設計について質問..." class="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white">
                            <button id="aiSendBtn" class="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                                <i data-lucide="send" class="w-5 h-5"></i>
                            </button>
                        </div>
                        <p class="mt-2 text-[10px] text-center text-slate-400">EDBB / Discord / 設計以外の質問にはお答えできません。</p>
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

        // 初期表示で履歴を反映
        this.renderHistory();
    }

    renderHistory() {
        const chatBody = document.getElementById('aiChatBody');
        chatBody.innerHTML = '';
        if (this.chatHistory.length === 0) {
            this.addMessageToUI('bot', 'こんにちは！EDBB専用 AI アシスタントです。Discord Botの設計やバグ報告について、お手伝いします！');
        } else {
            this.chatHistory.forEach(msg => {
                this.addMessageToUI(msg.role, msg.content);
            });
        }
    }

    toggleAiModal(show) {
        if (!this.aiModal || !document.getElementById('aiModal')) this.createAiModal();
        if (show) {
            this.aiModal.style.setProperty('display', 'flex', 'important');
            this.renderHistory();
        } else {
            this.aiModal.style.setProperty('display', 'none', 'important');
        }
    }

    async loadWebLLM() {
        if (this.webllm) return this.webllm;
        try {
            const module = await import("https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm");
            this.webllm = module;
            return module;
        } catch (e) { throw new Error("Library load failed"); }
    }

    async handleSendMessage() {
        const input = document.getElementById('aiChatInput');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        this.addChatMessage('user', text);

        try {
            if (!this.engine) await this.initEngine();
            if (!this.isLoaded) return;

            let code = "コードがありません。";
            if (typeof Blockly !== 'undefined' && this.workspace) {
                try {
                    if (Blockly.Python) code = Blockly.Python.workspaceToCode(this.workspace);
                } catch(e) {}
            }

            // 厳格なプロンプト設計
            const systemPrompt = `あなたは EDBB (Easy Discord Bot Builder) の AI アシスタントです。
あなたの任務は、EDBB の使い方、Discord Bot の設計、または現在のプログラムコードのレビュー・バグ報告を行うことのみです。
それ以外の世間話や、一般的なプログラミング以外の質問、エンタメ、ニュース等には一切答えず、「EDBB または Discord Bot、設計に関する質問以外はお答えできません。」と返してください。

現在のコード:
\`\`\`python
${code}
\`\`\`

ユーザーの質問に日本語で簡潔に答えてください。`;

            const loadingId = this.addMessageToUI('bot', '...', true);
            
            // 履歴（直近5件分）をコンテキストに含める
            const messages = [
                { role: "system", content: systemPrompt },
                ...this.chatHistory.slice(-5).map(m => ({ role: m.role, content: m.content })),
                { role: "user", content: text }
            ];

            const chunks = await this.engine.chat.completions.create({
                messages: messages,
                temperature: 0.7,
                stream: true
            });

            let fullText = "";
            for await (const chunk of chunks) {
                fullText += chunk.choices[0]?.delta?.content || "";
                this.updateChatMessageUI(loadingId, fullText);
            }

            // 最終結果を履歴に保存
            this.addChatMessage('bot', fullText, false, true);

        } catch (error) {
            this.addMessageToUI('bot', 'エラー: ' + error.message);
        }
    }

    async initEngine() {
        const pContainer = document.getElementById('aiLoadProgress');
        const pBar = document.getElementById('aiProgressBar');
        const pPct = document.getElementById('aiProgressPercent');
        const pTxt = document.getElementById('aiProgressText');

        try {
            const webllm = await this.loadWebLLM();
            pContainer.style.display = 'block';
            this.engine = new webllm.MLCEngine();
            this.engine.setInitProgressCallback((report) => {
                const progress = Math.round(report.progress * 100);
                pBar.style.width = progress + '%';
                pPct.innerText = progress + '%';
                pTxt.innerText = report.text;
            });
            await this.engine.reload(this.selectedModel);
            this.isLoaded = true;
            pContainer.style.display = 'none';
        } catch (e) {
            this.addMessageToUI('bot', '初期化エラー: ' + e.message);
            pContainer.style.display = 'none';
        }
    }

    // メモリとストレージへのデータ追加
    addChatMessage(role, content, isInit = false, isFinalBotResponse = false) {
        if (!isInit && !isFinalBotResponse) {
            // UIに表示するだけ (ユーザーメッセージ)
            this.chatHistory.push({ role, content });
            this.saveHistoryToStorage();
            this.addMessageToUI(role, content);
        } else if (isFinalBotResponse) {
            // AIの最終回答を履歴に保存
            this.chatHistory.push({ role, content });
            this.saveHistoryToStorage();
        }
    }

    addMessageToUI(role, text, isLoading = false) {
        const chatBody = document.getElementById('aiChatBody');
        const msgDiv = document.createElement('div');
        msgDiv.className = `flex ${role === 'user' ? 'justify-end' : 'items-start'} gap-3`;
        const id = 'msg-' + (isLoading ? 'loading' : Date.now());
        msgDiv.id = id;
        const avatarHtml = role === 'bot' ? `<div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0"><i data-lucide="bot" class="w-5 h-5 text-white"></i></div>` : '';
        const contentClass = role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700';
        msgDiv.innerHTML = `${avatarHtml}<div class="p-4 rounded-2xl ${contentClass} shadow-sm max-w-[85%]"><p class="text-sm whitespace-pre-wrap">${text}</p></div>`;
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
        if (window.lucide && role === 'bot') window.lucide.createIcons({ attrs: { class: 'lucide' }, nameAttr: 'data-lucide', root: msgDiv });
        return id;
    }

    updateChatMessageUI(id, text) {
        const msgDiv = document.getElementById(id);
        if (msgDiv) {
            const p = msgDiv.querySelector('p');
            if (p) p.innerText = text;
            const chatBody = document.getElementById('aiChatBody');
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    }

    clearHistory() {
        if (confirm("チャット履歴を削除しますか？")) {
            this.chatHistory = [];
            localStorage.removeItem(this.STORAGE_KEY);
            this.renderHistory();
        }
    }

    downloadHistory() {
        if (this.chatHistory.length === 0) return alert("履歴がありません。");
        const content = this.chatHistory.map(m => `[${m.role.toUpperCase()}]\n${m.content}\n`).join('\n---\n\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edbb_ai_history_${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
