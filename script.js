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
                let title = item.getElementsByTagName("title")[0].textContent.match(/"(.*?)"/)[1];
                let description = item.getElementsByTagName("description")[0].textContent;
                let link = item.getElementsByTagName("link")[0].textContent;

                // Strip HTML tags from the description
                const tmp = document.createElement("div");
                tmp.innerHTML = description;
                description = tmp.textContent || tmp.innerText || "";

                // Create the prompt for the API
                const prompt = `Read the following title and description to generate a summary of the title and comment in the description tag that includes short explanations for high school students of all main technology topics mentioned (e.g., software, tools, APIs, companies, acronyms, tech jargon). The text summary must not have XML tags, no new lines, no paraphrasing or repeating the title. Do not repeat that you are making a summary.

                Examples of good short explanations: 
                * A/B tests (comparing two versions of something to see which works better) 
                * dogfooding (testing products internally before public release)
                * PyPI (Python Package Index, a repository of software packages for Python)
                * API (Application Programming Interface, a set of rules that allows different software applications to communicate with each other)
                * SLOC (Source Lines of Code, a software metric used to measure the size of a computer program)
                * Google (a multinational technology company that specializes in Internet-related services and products)
                * IntelliJ IDEA (a Java integrated development environment for software developers)
                
                Return any bulleted list as unordered HTML <ul> with <li> items.
            
                Respond in this language: ${language}
                
                \nTitle: ${title}\nDescription: ${description}`;
              
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
                        <p><b>Title: ${title}</b></p>
                        <p><b>Original Comment:</b> ${description}</p>
                        <p><b>Summary:</b> ${summary} <a href='${link}' target='_blank'>[Link]</a></p>
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
