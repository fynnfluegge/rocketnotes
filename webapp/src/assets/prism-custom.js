import 'clipboard';

(function (){

    var hook = function (env) {

        // create wrapper for code element
        var wrapper = document.createElement('div');
        wrapper.classList.add("code-wrapper");
        var theme = getComputedStyle(env.element.parentElement)

        // check if element is inside a tabbed element
        if (env.element.parentElement.parentNode.classList.contains("tabbed")) {
            const elementId = Math.random().toString(36);
            let firstTab = false;
            // check if tab header already exists
            if (env.element.parentElement.parentNode.previousSibling == undefined || !env.element.parentElement.parentNode.previousSibling.classList?.contains("tab")) {
                firstTab = true;
                // create tab header
                var header = document.createElement('div');    
                header.classList.add("tab");
                env.element.parentElement.parentNode.parentNode.insertBefore(header, env.element.parentElement.parentNode);
            }

            // create tab button
            var tabButton = document.createElement('button');
            tabButton.innerHTML = env.language;
            tabButton.classList.add("tablinks", env.language);

            // set button background color from prism theme
            tabButton.style.backgroundColor = theme.backgroundColor;
            tabButton.style.color = theme.color;

            // add onclick event to tab button
            tabButton.onclick = function(event) { openTab(event, elementId); };

            // add tab button to tab header
            env.element.parentElement.parentNode.previousSibling.appendChild(tabButton);

            // if element is inside a tabbed element, add tabcontent class and id
            wrapper.classList.add("tabcontent");
            wrapper.setAttribute("id", elementId);
            // if element is the first tab, show it
            if (firstTab) {
                wrapper.style.display = "block";
            } else {
                tabButton.classList.add("inactive");
            }
            // set border top radius of element to 0
            env.element.parentElement.style.borderTopLeftRadius = "0";
            env.element.parentElement.style.borderTopRightRadius = "0";
            env.element.parentElement.style.marginTop = "0";
        }

        wrapper.style.position = "relative";
        env.element.parentElement.parentNode.insertBefore(wrapper, env.element.parentElement)

        var copyElement = document.createElement('div');
        copyElement.classList.add("copy");
        copyElement.style.backgroundColor = theme.backgroundColor;
        copyElement.innerHTML = '<i class="fa-regular fa-clone"></i>';

        wrapper.appendChild(env.element.parentElement);
        wrapper.appendChild(copyElement);
        
        // create clipboard for every copy element
        const clipboard = new ClipboardJS('.copy', {
            target: (trigger) => {
                return trigger.parentElement;
            }
        });

        // do stuff when copy is clicked
        clipboard.on('success', (event) => {
            event.trigger.innerHTML = '<i class="fa-solid fa-clone"></i>';
            setTimeout(() => {
                event.clearSelection();
                event.trigger.innerHTML = '<i class="fa-regular fa-clone"></i>';
            }, 500);
        });
    }

    Prism.hooks.add('complete', hook);
}());

function openTab(evt, id) {
    let targetElement = document.getElementById(id); 
    var tabcontent = targetElement.parentNode;

    // hide all tabcontent elements
    for (let i = 0; i < tabcontent.children.length; i++) {
        tabcontent.children[i].style.display = "none";
    }

    // set all tablinks inactive
    for (let i = 0; i < evt.currentTarget.parentNode.children.length; i++) {
        if (evt.currentTarget.parentNode.children[i] !== evt.currentTarget && 
            evt.currentTarget.parentNode.children[i].className.includes("inactive") == false)
            evt.currentTarget.parentNode.children[i].className = evt.currentTarget.parentNode.children[i].className += " inactive";
    }

    // remove inactive class from current tablink
    evt.currentTarget.className = evt.currentTarget.className.replace(" inactive", "");
    // show current tabcontent
    targetElement.style.display = "block";
}