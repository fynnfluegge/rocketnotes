import 'clipboard';
import 'prismjs';
// import 'prismjs/components/prism-typescript.min.js';
// import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
// import 'prismjs/plugins/line-highlight/prism-line-highlight.js';

(function (){

    var hook = function (env) {

        console.log(env.element.parentElement.parentNode)

        var wrapper = document.createElement('div');
        wrapper.style.position = "relative";
        env.element.parentElement.parentNode.insertBefore(wrapper, env.element.parentElement)

        var copyElement = document.createElement('div');
        copyElement.classList.add("copy");
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

        function isPrismClass(preTag, language) { 
            return preTag.className === 'language-' + language
        }
    }

    Prism.hooks.add('complete', hook);
}());