class Plugin {
    constructor(workspace) {
        this.workspace = workspace;
        this.aiBtn = null;
        this.aiModal = null;
        this.session = null;
    }

    async onload() {
        this.createAiButton();
        this.createAiModal();
        console.log("AIChecker Plugin loaded!");
    }

    async onunload() {
        if (this.aiBtn) this.aiBtn.remove();
        if (this.aiModal) this.aiModal.remove();
        if (this.session) {
            this.session.destroy();
            this.session = null;
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

        // Lucideアイコンの再描画
        if (window.lucide) {
            window.lucide.createIcons({
                attrs: {
                    class: 'lucide'
                },
                nameAttr: 'data-lucide'
            });
        }

        aiBtn.addEventListener('click', () => this.toggleAiModal(true));
    }

    createAiModal() {
        const modalHtml = `
            <div id="aiModal" class="modal-backdrop hidden fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div class="flex flex-col w-full max-w-2xl h-[80vh] overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-slate-900 modal-content border border-white/20 dark:border-slate-700/50">
                    <!-- Header -->
                    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                        <div class="flex items-center gap-3">
                            <div class="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                <i data-lucide="sparkles" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h2 class="text-lg font-bold text-slate-800 dark:text-white">AIChecker</h2>
                                <p class="text-xs text-slate-500 dark:text-slate-400">Gemini Nano powered code review</p>
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
                                <p class="text-sm dark:text-slate-200">こんにちは！EDBBのアシスタントです。現在のコードのレビューやバグの報告をお手伝いします。何かお手伝いできることはありますか？</p>
                            </div>
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
                        <p class="mt-2 text-[10px] text-center text-slate-400">Gemini Nano (Chrome Built-in AI) を使用しています。</p>
                    </div>
                </div>
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
        this.aiModal = document.getElementById('aiModal');

        if (window.lucide) {
            window.lucide.createIcons({
                attrs: {
                    class: 'lucide'
                },
                nameAttr: 'data-lucide'
            });
        }

        document.getElementById('closeAiModalBtn').addEventListener('click', () => this.toggleAiModal(false));
        document.getElementById('aiSendBtn').addEventListener('click', () => this.handleSendMessage());
        document.getElementById('aiChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        });

        // モーダルの背景クリックで閉じる
        this.aiModal.addEventListener('click', (e) => {
            if (e.target === this.aiModal) this.toggleAiModal(false);
        });
    }

    toggleAiModal(show) {
        if (show) {
            this.aiModal.classList.remove('hidden');
            setTimeout(() => this.aiModal.classList.add('show-modal'), 10);
        } else {
            this.aiModal.classList.remove('show-modal');
            setTimeout(() => this.aiModal.classList.add('hidden'), 300);
        }
    }

    async handleSendMessage() {
        const input = document.getElementById('aiChatInput');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        this.addChatMessage('user', text);

        // APIの場所を特定
        let aiApi = null;
        let isNewApi = false;

        if (window.ai && window.ai.languageModel) {
            aiApi = window.ai.languageModel;
        } else if (typeof LanguageModel !== 'undefined') {
            aiApi = LanguageModel;
            isNewApi = true;
        }

        if (!aiApi) {
            this.addChatMessage('bot', '申し訳ありません。お使いのブラウザで Gemini Nano (Built-in AI) が有効になっていないようです。もしくは、最新の Chrome Flag 設定が必要です。');
            return;
        }

        try {
            if (!this.session) {
                let available = 'no';
                if (isNewApi) {
                    // v145+ の新しい API 形式
                    available = await aiApi.availability();
                } else {
                    // 標準的な API 形式
                    const caps = await aiApi.capabilities();
                    available = caps.available;
                }

                if (available === 'no' || available === 'unavailable') {
                    this.addChatMessage('bot', '【警告】Gemini Nano の準備ができていません（ステータス: ' + available + '）。ディスク容量不足の可能性がありますが、作成を強行してみます。しばらくお待ちください...');
                }
                
                this.session = await aiApi.create({
                    expectedUsage: 'text-review',
                    outputLanguage: 'ja',
                    systemPrompt: "あなたは EDBB (Easy Discord Bot Builder) の AI アシスタントです。ユーザーが作成した Blockly から生成された Python (discord.py) コードをレビューし、バグの報告や改善案を提示してください。回答は日本語で行ってください。EDBB に関係のない世間話や質問は『EDBB に関すること以外はお答えできません。』とだけ答えて無視してください。"
                });
            }

            // 現在のコード取得
            let code = "コードがありません。";
            if (typeof Blockly !== 'undefined' && this.workspace) {
                try {
                // Blockly.Python が利用可能な場合のみ
                if (Blockly.Python) {
                    code = Blockly.Python.workspaceToCode(this.workspace);
                }
                } catch(e) {
                    console.error("Code generation failed", e);
                }
            }

            const prompt = `
現在のコード:
\`\`\`python
${code}
\`\`\`

ユーザーの質問: ${text}
`;

            const loadingId = this.addChatMessage('bot', '考え中...', true);
            
            const response = await this.session.prompt(prompt);
            this.updateChatMessage(loadingId, response);

        } catch (error) {
            console.error("AI Error:", error);
            this.addChatMessage('bot', 'AI の呼び出し中にエラーが発生しました。: ' + error.message);
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
                <p class="text-sm whitespace-pre-wrap">${text}</p>
            </div>
        `;

        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;

        if (window.lucide && role === 'bot') {
            window.lucide.createIcons({
                attrs: {
                    class: 'lucide'
                },
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
            if (p) p.innerText = text;
            const chatBody = document.getElementById('aiChatBody');
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    }
}
