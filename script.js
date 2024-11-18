window.onload = function() {
    // Function to get query parameter value
    function getQueryParam(param) {
        let urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Function to get value from localStorage or query param
    function getParamValue(param) {
        let value = getQueryParam(param);
        if (value) {
            localStorage.setItem(param, value);
        } else {
            value = localStorage.getItem(param);
        }
        if (!value) {
            console.error(`ERROR: ${param} is not provided and not found in localStorage`);
        }
        return value;
    }

    // Get values from query params or localStorage
    let apiKey = getParamValue('apikey');
    let rssUrl = getParamValue('rssUrl');
    let maxItems = getParamValue('maxItems') || 15;
    let language = getParamValue('language') || "english";

    // If any of the required parameters are missing, stop execution
    if (!apiKey || !rssUrl || !maxItems || !language) {
        if (!apiKey) console.error("ERROR: Missing: apiKey");
        if (!rssUrl) console.error("ERROR: Missing: rssUrl");
        if (!maxItems) console.error("ERROR: Missing: maxItems");
        if (!language) console.error("ERROR: Missing: language");
        return;
    }

    // Set up the main container
    const mainDiv = document.getElementById('main');

    // OpenAI API URL
    const apiUrl = "https://api.openai.com/v1/chat/completions";

    // Fetch the RSS feed
    fetch(rssUrl)
        .then(response => {
            if (!response.ok) throw new Error("ERROR: Failed to fetch RSS feed");
            return response.text();
        })
        .then(str => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(str, "text/xml");
            const items = Array.from(xmlDoc.getElementsByTagName("item")).slice(0, maxItems);

            // Iterate over each RSS item and send the title and comment to the OpenAI API
            items.forEach(item => {
                //let title = item.getElementsByTagName("title")[0].textContent.match(/"(.*?)"/)[1];
                let title = item.getElementsByTagName("title")[0].textContent;
                let comment = item.getElementsByTagName("description")[0].textContent;
                let link = item.getElementsByTagName("link")[0].textContent;
                let commentsLink = item.getElementsByTagName("comments")[0].textContent;

                // Strip HTML tags from the comment
                const tmp = document.createElement("div");
                tmp.innerHTML = comment;
                comment = tmp.textContent || tmp.innerText || "";

                // Create the prompt for the API
                /*const prompt = `Read the following title and comment to generate a summary that includes short definitions for high school students of all main technology topics mentioned. For example: software, tools, APIs, companies, acronyms, tech jargon; do not include people.

                Examples of good definitions with bolded <b> words:
                * **A/B tests** comparing two versions of something to see which works better
                * **dogfooding** testing products internally before public release)
                * **PyPI: Python Package Index** a repository of software packages for Python
                * **API** Application Programming Interface, a set of rules that allows different software applications to communicate with each other
                * **SLOC** Source Lines of Code, a software metric used to measure the size of a computer program
                * **Google** a multinational technology company that specializes in Internet-related services and products
                * **IntelliJ IDEA** a Java integrated development environment for software developers.
                            
                There are 3 requirements to the response; both must be met: 

                Requirement 1: Respond in this language: ${language}. Bolded <b> words being defined must always be in English (e.g., **pressure sensor** un dispositivo que detecta cambios en la presión del aire o de otros fluidos)
                
                Requirement 2: Ignore this requirement if ${language} is English. Words used for acronyms should be BOTH untranslated AND translated. Examples: CSS: Cascading Style Sheets o Hojas de Estilo en Cascada, SLOC: Source Lines of Code o Líneas de Código Fuente, API: Application Programming Interface o Interfaz de Programación de Aplicaciones
                
                Requirement 3: Return a short comment summary AND a bulleted list of definitions as unordered HTML <ul> with <li> items. Do not include definitions in the summary. Returned text must not have new lines and no paraphrasing or repeating the title. Do not repeat that you are making a summary and avoid text like "in the comment".

                The response is incorrect unless all requirements are followed.

                \nTitle: ${title}\nComment: ${comment}`;*/

                const prompt = `In 1-3 sentences, explain why this might be interesting, define any tech jargon in 1-2 sentences, and bold with HTML <b> any keywords. Respond in this language: ${language}. INPUT: ${title}`;
              
                console.log("Prompt: " + prompt);

                // API request data
                const data = {
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "user", content: prompt }
                    ]
                };

                // Make the OpenAI API request
                fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(data)
                })
                .then(response => {
                    if (!response.ok) throw new Error("ERROR: API request to OpenAI failed");
                    return response.json();
                })
                .then(apiData => {
                    let summary = apiData.choices[0].message.content;
                    summary = summary.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

                    const listItem = document.createElement("li");
                    listItem.innerHTML = `
                        <p id="title"><b>${title}</b></p>
                        <!-- <p id="comment"><b>Original Comment:</b> ${comment}</p> -->
                        <p id="summary"><b>Summary:</b> ${summary} <a href='${link}' target='_blank'>[Link]</a>&nbsp;<a href='${commentsLink}' target='_blank'>[Comments]</a></p>
                    `;
                    mainDiv.appendChild(listItem);
                })
                .catch(error => {
                    console.error("ERROR: Fetching summary:", error);
                });
            });
        })
        .catch(error => {
            console.error("ERROR: Fetching RSS feed:", error);
        });
};
