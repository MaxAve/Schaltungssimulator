document.getElementById("ai-button").onclick = function() {
    if (document.getElementById("ai-popover").style.display !== "none") {
        document.getElementById("ai-popover").style.display = "none";
    } else {
        document.getElementById("ai-popover").style.display = "block";
    }
}
class GroqChat extends HTMLElement {
    constructor() {
        super();
        let shadow = this.attachShadow({ mode: 'open' });
        this.shadow = shadow;
        this.state = {
            apiKey: localStorage.getItem("groq-key"),
            prompt: "",
            output: "",
            generating: false,
        };
        this.render();
        this.addEventListeners();
    };

    render() {
        let html = `
      <style>
        /* Add some basic styling */
        :host {
          display: block;
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        #prompt-input {
          width: 90%;
          padding: 10px;
          font-size: 16px;
        }
        #api-key-input {
          width: 100%;
          padding: 10px;
          font-size: 16px;
        }
        #generate-button {
          background-color: #4CAF50;
          color: #fff;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        textarea {
margin-left: 10px;
margin-right: 10px;
}
        #generate-button:hover {
          background-color: #3e8e41;
        }
        #progress-indicator {
          display: none;
          margin-top: 10px;
        }
        #output {
          margin-top: 20px;
        }
      </style>
      `;

        if (!this.state.apiKey) {
            html += `
        <h2>Schaltplan KI</h2>
        <label for="api-key-input">API Key:</label>
        <input id="api-key-input"  type="text" placeholder="Enter your API key">
        <button id="save-button">Save</button>
        `;
        } else {
            html += `
        <div style="display: flex; margin-top: 8px; flex-direction: row; justify-content: center; align-items: center">
      <h2>Schaltplan KI</h2>
</div>
      <textarea id="prompt-input" type="text" placeholder="Was möchstest du generieren?"></textarea>
        <div style="display: flex; margin-top: 8px; flex-direction: row; justify-content: center; align-items: center">
      <button id="generate-button">Generieren</button>
      <div id="progress-indicator">
</div>
        <svg width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke-width="2" stroke="#4CAF50" fill="none" />
        </svg>
      </div>
      <div id="output"></div>
    `;
        }

        this.shadow.innerHTML = html;
    };

    addEventListeners() {
        const apiKeyInput = this.shadowRoot.getElementById('api-key-input');
        const saveButton = this.shadowRoot.getElementById('save-button');
        const promptInput = this.shadowRoot.getElementById('prompt-input');
        const generateButton = this.shadowRoot.getElementById('generate-button');
        const progressIndicator = this.shadowRoot.getElementById('progress-indicator');
        const outputDiv = this.shadowRoot.getElementById('output');

        if (saveButton) {
            saveButton.addEventListener('click', async () => {
                const apiKey = apiKeyInput.value.trim();
                if (apiKey) {
                    localStorage.setItem("groq-key", apiKey);
                    this.state.apiKey = apiKey;
                    this.render();
                    this.addEventListeners();
                } else {
                    alert('Please enter a valid API key');
                }
            });
        }

        if (generateButton) {
            generateButton.addEventListener('click', async () => {
                this.state.apiKey = localStorage.getItem("groq-key");
                if (this.state.generating) {
                    return;
                }
                const prompt = promptInput.value.trim();

                if (!prompt) {
                    alert('Please enter a prompt');
                    return;
                }

                this.state.generating = true;
                progressIndicator.style.display = 'block';

                const apiKey = this.state.apiKey;

                try {
                    let completion = await requestCompletion(apiKey, prompt);
                    if (completion) {
                        if (completion.startsWith("```json")) {
                            completion = completion.slice(8);
                        } else if (completion.startsWith("```")) {
                            completion = completion.slice(3);
                        }
                        if (completion.endsWith("```")) {
                            completion = completion.slice(0, -3);
                        }
                        upload(completion);
                        this.state.output = "Schaltplan wurde generiert"
                    } else {
                        this.state.output = 'Fehler beim Generieren des Schaltplans';
                    }
                } catch (error) {
                    console.error(error);
                    this.state.output = 'Fehler beim Request zu Groq';
                } finally {
                    this.state.generating = false;
                    progressIndicator.style.display = 'none';
                    outputDiv.innerHTML = `
                    <pre>${this.state.output}</pre>
                  `;
                }
            });
        }
    }
}

async function checkKey(apiKey, retry = 0) {
    if (retry >= 3) {
        return false;
    }
    try {
        let result = requestCompletion(apiKey, "Hello")
        if (result === null) {
            return false
        }
        return true
    } catch (e) {
        if (e.message === "invalid") {
            return false;
        }
        return checkKey(apiKey, retry + 1);
    }
}
async function requestCompletion(apiKey, prompt) {
    try {
        const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: sys_prompt,
                    },
                    {
                        role: "user",
                        content: prompt
                    },
                ],
                "model": "llama-3.3-70b-versatile",
                "temperature": 1,
                "max_completion_tokens": 16384,
                "top_p": 1,
                "stream": false,
                "stop": null
            })
        });

        if (response.status !== 200) {
            throw new Error("invalid");
        }
        const data = await response.json();
        let completion = data.choices[0].message.content
        return completion
    } catch (e) {
        return null;
    }
}

customElements.define('groq-chat', GroqChat);

