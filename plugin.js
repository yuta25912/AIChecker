class Plugin {
    constructor(workspace) {
        this.workspace = workspace;
        this.aiBtn = null;
        this.aiModal = null;
        this.engine = null;
        this.selectedModel = "gemma-2-2b-it-q4f16_1-MLC";
        this.isLoaded = false;
    }

    async onload() {
        this.createAiButton();
        this.createAiModal();
        console.log("AIChecker (WebLLM version) loaded!");
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

    createAiButton() {
        const pluginBtn = document.getElementById('pluginBtn');
        if (!pluginBtn) return;

        const aiBtn = document.createElement('button');
        aiBtn.id = 'aiCheckerBtn';
        aiBtn.className = 'ml-2 group relative inline-flex items-center justify-center gap-2 px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200 transition-all duration-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-95 shadow-sm';
        aiBtn.innerHTML = `
            <i data-lucide="sparkles" class="w-4 h-4 text-indigo-500 transition-transform group-hover:rotate-12"></i>
            <span class="hidden sm:inline">AIレビュー</span>
        `;
        
        pluginBtn.parentNode.insertBefore(aiBtn, pluginBtn);
        this.aiBtn = aiBtn;

        if (window.lucide) {
            window.lucide.createIcons({
                attrs: { class: 'lucide' },
                nameAttr: 'data-lucide'
            });
        }

        aiBtn.addEventListener('click', () => {
            console.log("AIレビューボタンがクリックされました");
            this.toggleAiModal(true);
        });
    }

    createAiModal() {
        // 既存のモーダルがあれば削除して重複を防ぐ
        const oldModal = document.getElementById('aiModal');
        if (oldModal) oldModal.remove();

        const modalHtml = `
            <div id="aiModal" style="display: none; position: fixed; inset: 0; z-index: 999999 !important; align-items: center; justify-content: center; padding: 1rem; background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);">
                <!-- クラス名を衝突回避のために ai-checker-modal-content に変更 -->
                <div class="flex flex-col w-full max-w-2xl h-[80vh] overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ai-checker-modal-content" style="opacity: 1 !important; transform: scale(1) !important;">
                    <!-- Header -->
                    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                        <div class="flex items-center gap-3">
                            <div class="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                <i data-lucide="sparkles" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h2 class="text-lg font-bold text-slate-800 dark:text-white">AIChecker (WebLLM)</h2>
                                <p class="text-xs text-slate-500 dark:text-slate-400">Gemma 2 2B powered review</p>
                            </div>
                        </div>
                        <button id="closeAiModalBtn" class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <!-- Chat Body -->
                    <div id="aiChatBody" class="flex-grow p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
                        <div class="flex items-start gap-3">
                            <div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                                <i data-lucide="bot" class="w-5 h-5 text-white"></i>
                            </div>
                            <div class="p-4 rounded-2xl rounded-tl-none bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 max-w-[85%]">
                                <p class="text-sm dark:text-slate-200">こんにちは！WebLLM版 AIChecker です。Gemma 2 2B をローカルで実行します。<br><br>初回実行時はモデル（約1.5GB）のダウンロードが必要です。開始するには何かメッセージを送ってください。</p>
                            </div>
                        </div>
                    </div>

                    <!-- Progress Bar (Hidden by default) -->
                    <div id="aiLoadProgress" style="display: none;" class="px-6 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                        <div class="flex justify-between mb-1">
                            <span id="aiProgressText" class="text-[10px] text-slate-500 dark:text-slate-400">モデルをロード中...</span>
                            <span id="aiProgressPercent" class="text-[10px] font-bold text-indigo-500">0%</span>
                        </div>
                        <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div id="aiProgressBar" class="bg-indigo-600 h-1.5 w-0 transition-all duration-300"></div>
                        </div>
                    </div>

                    <!-- Input Footer -->
                    <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div class="flex gap-2">
                            <input id="aiChatInput" type="text" placeholder="コードをレビューして..." class="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white">
                            <button id="aiSendBtn" class="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                                <i data-lucide="send" class="w-5 h-5"></i>
                            </button>
                        </div>
                        <p class="mt-2 text-[10px] text-center text-slate-400">WebLLM / Gemma 2 2B / WebGPU を使用しています。</p>
                    </div>
                </div>
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = modalHtml.trim();
        const modalElement = div.firstElementChild;
        document.body.appendChild(modalElement);
        this.aiModal = modalElement;

        console.log("AI Modal Force Created and Appended to Body");

        if (window.lucide) {
            window.lucide.createIcons({
                attrs: { class: 'lucide' },
                nameAttr: 'data-lucide',
                root: this.aiModal
            });
        }

        document.getElementById('closeAiModalBtn').addEventListener('click', () => this.toggleAiModal(false));
        document.getElementById('aiSendBtn').addEventListener('click', () => this.handleSendMessage());
        document.getElementById('aiChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        });
        this.aiModal.addEventListener('click', (e) => {
            if (e.target === this.aiModal) this.toggleAiModal(false);
        });
    }

    toggleAiModal(show) {
        if (!this.aiModal || !document.getElementById('aiModal')) {
            console.log("AI Modal not found in DOM, re-creating...");
            this.createAiModal();
        }

        if (show) {
            console.log("Opening AI Modal (Ver. dev7)...");
            this.aiModal.style.setProperty('display', 'flex', 'important');
            // サイト側の .modal-content の干渉を避けるため show-modal は使わず直接制御
        } else {
            console.log("Closing AI Modal...");
            this.aiModal.style.setProperty('display', 'none', 'important');
        }
    }

    async loadWebLLM() {
        if (this.webllm) return this.webllm;
        try {
            console.log("Downloading WebLLM module...");
            // ESM 対応のため動的インポートを使用
            const module = await import("https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm");
            this.webllm = module;
            return module;
        } catch (e) {
            console.error("Failed to load WebLLM:", e);
            throw new Error("AIライブラリの読み込みに失敗しました。インターネット接続を確認してください。");
        }
    }

    async handleSendMessage() {
        const input = document.getElementById('aiChatInput');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        this.addChatMessage('user', text);

        try {
            if (!this.engine) {
                await this.initEngine();
            }

            if (!this.isLoaded) return;

            // 現在のコード取得
            let code = "コードがありません。";
            if (typeof Blockly !== 'undefined' && this.workspace) {
                try {
                    if (Blockly.Python) {
                        code = Blockly.Python.workspaceToCode(this.workspace);
                    }
                } catch(e) { console.error(e); }
            }

            const prompt = `あなたは EDBB (Easy Discord Bot Builder) の AI アシスタントです。
現在のコード:
\`\`\`python
${code}
\`\`\`

ユーザーの質問: ${text}
回答は日本語で簡潔に行ってください。EDBB に関すること以外は「EDBB に関すること以外はお答えできません。」とだけ答えてください。`;

            const loadingId = this.addChatMessage('bot', 'AI 実行中...', true);
            
            const chunks = await this.engine.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                stream: true
            });

            let fullText = "";
            for await (const chunk of chunks) {
                const content = chunk.choices[0]?.delta?.content || "";
                fullText += content;
                this.updateChatMessage(loadingId, fullText);
            }

        } catch (error) {
            console.error("AI Error:", error);
            this.addChatMessage('bot', 'エラーが発生しました: ' + error.message);
        }
    }

    async initEngine() {
        const progressContainer = document.getElementById('aiLoadProgress');
        const progressBar = document.getElementById('aiProgressBar');
        const progressPercent = document.getElementById('aiProgressPercent');
        const progressText = document.getElementById('aiProgressText');

        try {
            this.addChatMessage('bot', 'WebLLM ライブラリを読み込んでいます...');
            const webllm = await this.loadWebLLM();
            
            progressContainer.style.display = 'block';
            this.engine = new webllm.MLCEngine();
            
            this.engine.setInitProgressCallback((report) => {
                const text = report.text;
                const progress = Math.round(report.progress * 100);
                progressBar.style.width = progress + '%';
                progressPercent.innerText = progress + '%';
                progressText.innerText = text;
            });

            await this.engine.reload(this.selectedModel);
            this.isLoaded = true;
            progressContainer.style.display = 'none';
            this.addChatMessage('bot', 'モデルの準備が完了しました！レビューを開始します。');

        } catch (e) {
            console.error("Init Error:", e);
            this.addChatMessage('bot', '初期化中にエラーが発生しました。WebGPU が無効か、メモリが不足している可能性があります。');
            progressContainer.style.display = 'none';
        }
    }

    addChatMessage(role, text, isLoading = false) {
        const chatBody = document.getElementById('aiChatBody');
        const msgDiv = document.createElement('div');
        msgDiv.className = `flex ${role === 'user' ? 'justify-end' : 'items-start'} gap-3`;
        
        const id = 'msg-' + Date.now();
        msgDiv.id = id;

        const avatarHtml = role === 'bot' ? 
            `<div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                <i data-lucide="bot" class="w-5 h-5 text-white"></i>
            </div>` : '';

        const contentClass = role === 'user' ? 
            'bg-indigo-600 text-white rounded-br-none' : 
            'bg-white dark:bg-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700';

        msgDiv.innerHTML = `
            ${avatarHtml}
            <div class="p-4 rounded-2xl ${contentClass} shadow-sm max-w-[85%]">
                <p class="text-sm border-none bg-transparent outline-none w-full">${text}</p>
            </div>
        `;

        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;

        if (window.lucide && role === 'bot') {
            window.lucide.createIcons({
                attrs: { class: 'lucide' },
                nameAttr: 'data-lucide',
                root: msgDiv
            });
        }

        return id;
    }

    updateChatMessage(id, text) {
        const msgDiv = document.getElementById(id);
        if (msgDiv) {
            const p = msgDiv.querySelector('p');
            if (p) {
                p.innerText = text;
            }
            const chatBody = document.getElementById('aiChatBody');
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    }
}
