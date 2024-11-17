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

            // Iterate over each RSS item and send the title and description to the OpenAI API
            items.forEach(item => {
                let title = item.getElementsByTagName("title")[0].textContent;
                let description = item.getElementsByTagName("description")[0].textContent;
                let link = item.getElementsByTagName("link")[0].textContent;

                // Strip HTML tags from the description
                const tmp = document.createElement("div");
                tmp.innerHTML = description;
                description = tmp.textContent || tmp.innerText || "";

                // Create the prompt for the API
                const prompt = `Read the following title and description to generate a summary of the title and comment in the description tag that includes very brief explanations for high school students of the main technology topics mentioned (e.g., software, tools, APIs, companies, acronyms, tech jargon). The text summary must not have XML tags, no new lines, no paraphrasing or repeating the title, and should be in English. Do not repeat that you are making a summary.
                
                Put bold <b> HTML tags around important words and keywords in the summaries. Highlight key words and phrases (e.g., names, institutes, locations, amounts) with bold in the following text except news source at the end. At least 1 word must be made bold per summary.IMPORTANT USE HTML <b> not Markdown tags!!! Example: <b>Biden</b> visited <b>Vietnam</b> today. You must translate your responses to this language: ${language}
                
                \n\nTitle: ${title}\nDescription: ${description}`;

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
                    summary += ` <a href='${link}' target='_blank'>[Link]</a>`;

                    const listItem = document.createElement("li");
                    listItem.innerHTML = summary;
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
