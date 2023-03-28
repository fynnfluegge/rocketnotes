import 'clipboard';

(function (){

    var hook = function (env) {

        var wrapper = document.createElement('div');
        wrapper.classList.add("code-wrapper");
        
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
    }

    Prism.hooks.add('complete', hook);
}());