
class Dialog {
    constructor(element) {
        this.element = element;
        this.onClose = null;

        const buttons = [...element.querySelectorAll('button')];
        for (const button of buttons) {
            button.addEventListener('click', () => {
                this.returnValue = button.classList.contains('ok-button');
                this.close();
            });
        }

        this.returnValue = false;

        const fileList = element.querySelector('ul.file-list');
        if (fileList) {
            this.selectedFile = null;
            fileList.addEventListener('click', (e) => {
                const target = e.target;
                if (target.tagName === 'LI') {
                    this.selectedFile = target.dataset.filename;
                    [...fileList.querySelectorAll('li')].forEach((li) => li.classList.remove('selected'));
                    target.classList.add('selected');
                }
            });
            fileList.addEventListener('dblclick', (e) => {
                const target = e.target;
                if (target.tagName === 'LI') {
                    this.returnValue = true;
                    this.close();
                }
            })
        }
    }

    showModal() {
        this.element.showModal();
    }

    close() {
        this.element.close();
        if (this.onClose) this.onClose(this.returnValue);
    }

    set filenames(value) {
        const fileList = this.element.querySelector('ul.file-list');
        if (fileList) {
            fileList.innerHTML = '';
            for (const filename of value) {
                const li = document.createElement('li');
                li.dataset.filename = filename;
                li.textContent = filename;
                fileList.appendChild(li);
            }
        }
    }
};

export const getDialog = (id) => {
    const element = document.getElementById(id);
    if (element.custom_initialized) {
        return element.dialogObject;
    }

    const dialog = new Dialog(element);
    element.dialogObject = dialog;
    element.custom_initialized = true;
    return dialog;
};
