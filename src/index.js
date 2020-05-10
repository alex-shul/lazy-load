String.prototype.replaceAll = String.prototype.replaceAll || function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

const loaderSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38" stroke="rgba(33,33,33,0.25)"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg transform="translate(1 1)" stroke-width="2"%3E%3Ccircle stroke-opacity=".55" cx="18" cy="18" r="18"/%3E%3Cpath d="M36 18c0-9.94-8.06-18-18-18"%3E%3CanimateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite"/%3E%3C/path%3E%3C/g%3E%3C/g%3E%3C/svg%3E';

function addStyles(styles) {
    const style = document.createElement("style");
    style.appendChild(document.createTextNode(styles.toString()));
    document.head.appendChild(style);
}

function isIterable(obj) {
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

function getScrollY() {
    const doc = document.documentElement;
    return (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
}

function viewport() {
    let e = window, a = 'inner';
    if (!( 'innerWidth' in window )) {
        a = 'client';
        e = document.documentElement || document.body;
    }
    return { width : e[a+'Width'] , height : e[a+'Height'] }
}

function getWindowWidth() {
    return viewport().width;
}

function getWindowHeight() {
    return viewport().height;
}

class LazyLoadManager {
    constructor(options) {
        const defaultOptions = {
            selector: ".lazy-load",
            usePlaceholder: true,
            useLoader: true,
            loadingClass: "loading",
            completeClass: "loaded",
            failedClass: "failed",
            onLoad: () => {}
        }
        this.options = {...defaultOptions, ...options};
        const {
            selector
        } = options;
        this.images = typeof selector === 'string' ? window.document.querySelectorAll(selector) : selector;
        if (isIterable(this.images)) {
            this.images = [].slice.call(this.images);
        } else {
            this.images = [];
            console.error(`LazyLoad: selector must be a string or iterable object.`);
        }

    }
    init() {
        // Add styles for loading class
        if (this.options.useLoader) {
            addStyles(`
                img.${this.options.loadingClass} {
                    position: relative;
                    z-index: 0;
                }
                .${this.options.loadingClass}:before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1;
                    background-color: rgba(33,33,33,.05);
                    background-repeat: no-repeat;
                    background-position: center center;
                    background-image: url(${loaderSrc});
                }
            `);
        }

        this.images.forEach(img => {
            // Add loading class
            img.classList.add(this.options.loadingClass);

            // Add dummy placeholder
            if (this.options.usePlaceholder) {
                img.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200px' height='100px' viewBox='0 0 756 499'/>";
            }
        });

        // Bind update method
        this.bindedUpdate = this.update.bind(this);

        //	Check on scroll and resize
        window.addEventListener('scroll', this.bindedUpdate);
        window.addEventListener('resize', this.bindedUpdate);

        //	Initial update
        this.bindedUpdate();

        // DOM mutation observer
        if (MutationObserver in window) {
            this.observer = new MutationObserver(this.bindedUpdate);
            this.observer.observe(window.document.body, {subtree: true, childList: true});
        }
    }
    update() {
        //	Thanks to: https://github.com/craigbuckler/progressive-image.js
        if (this.images.length) {
            requestAnimationFrame(function() {
                let winTop,
                    winBottom,
                    clientRect,
                    elementAbsoluteTop,
                    elementAbsoluteBottom,
                    p = 0;

                winTop = getScrollY();
                winBottom = winTop + getWindowHeight();

                while (p < this.images.length) {
                    clientRect = this.images[p].getBoundingClientRect();
                    elementAbsoluteTop = winTop + clientRect.top;
                    elementAbsoluteBottom = elementAbsoluteTop + clientRect.height;

                    if (winTop < elementAbsoluteBottom && winBottom > elementAbsoluteTop) {
                        this.onView(this.images[p]);
                        this.images.splice(p, 1);
                        if(!this.images.length)
                            this.end();
                    } else {
                        // Increase counter only if element
                        // wasn't dropped
                        p++;
                    }
                }
            }.bind(this));
        } else {
            this.end();
        }
    }
    onView(img) {
        img.onload = function() {
            img.classList.remove(this.options.loadingClass);
            img.classList.add(this.options.completeClass);
            if (typeof this.options.onLoad === 'function') {
                this.options.onLoad.call(img, false);
            }
        }.bind(this);
        img.onerror = function() {
            img.classList.remove(this.options.loadingClass);
            img.classList.add(this.options.failedClass);
            if (typeof this.options.onLoad === 'function') {
                this.options.onLoad.call(img, true);
            }
        }.bind(this);
        // if(isWebp() && !this.classList.contains( skipClass )) {
        //     if( this.hasAttribute('data-srcset') ) {
        //         if( this.dataset.srcset.indexOf('.jpg') ) {
        //             this.dataset.srcset = this.dataset.srcset.replaceAll( '.jpg', '.jpg.webp' );
        //         } else if( this.dataset.srcset.indexOf('.png') ) {
        //             this.dataset.srcset = this.dataset.srcset.replaceAll( '.png', '.png.webp' );
        //         } else if( this.dataset.srcset.indexOf('.bmp') ) {
        //             this.dataset.srcset = this.dataset.srcset.replaceAll( '.bmp', '.bmp.webp' );
        //         }
        //         this.srcset = this.dataset.srcset;
        //     }
        //     this.src = this.dataset.src + '.webp';
        // } else {
            if(img.hasAttribute('data-srcset') ) {
                img.srcset = img.dataset.srcset;
            }
            img.src = img.dataset.src;
        //}
    }
    end() {
        if(this.observer) this.observer.disconnect();

        window.removeEventListener('scroll', this.bindedUpdate);
        window.removeEventListener('resize', this.bindedUpdate);
    }
}

export function lazyLoad(options = {}) {
    const m = new LazyLoadManager(options);
    m.init();
}
