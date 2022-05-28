import 'clipboard';
import 'prismjs';
// import 'prismjs/components/prism-typescript.min.js';
// import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
// import 'prismjs/plugins/line-highlight/prism-line-highlight.js';

(function (){

    var hook = function (env) {
        const pres = document.getElementsByTagName("pre")
        
        if (pres !== null ) {
            for (let i = 0; i < pres.length; i++) {
                // check if its a pre tag with a prism class
                if (isPrismClass(pres[i], env.language)) {
                    // insert code and copy element
                    pres[i].innerHTML = `<div class="copy"><i class="fa-regular fa-clone"></i></div>${pres[i].innerHTML}`
                }
            }
        }

        // create clipboard for every copy element
        const clipboard = new ClipboardJS('.copy', {
            target: (trigger) => {
                trigger.setse
                return trigger.nextElementSibling;
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