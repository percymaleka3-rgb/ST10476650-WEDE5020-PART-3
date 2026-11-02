const SC = (() => {
    const icons = {
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
        next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>'
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const el = (tag, options = {}, children = []) => {
        const node = document.createElement(tag);
        Object.entries(options).forEach(([key, value]) => {
            if (value === undefined || value === null || value === false) return;
            if (key === "className") node.className = value;
            else if (key === "text") node.textContent = value;
            else if (key === "dataset") Object.assign(node.dataset, value);
            else node.setAttribute(key, value === true ? "" : value);
        });
        children.filter(Boolean).forEach((child) => node.append(child));
        return node;
    };

    const formatRand = (amount) =>
        "R" + amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const createPicture = ({ image, widths, alt, sizes = "100vw", eager = false, width = 480, height = 360 }) => {
        const srcset = (format) => widths.map((w) => `images/${image}-${w}.${format} ${w}w`).join(", ");
        const img = el("img", {
            src: `images/${image}-${widths[0]}.jpg`,
            srcset: srcset("jpg"),
            sizes,
            alt,
            width,
            height,
            loading: eager ? "eager" : "lazy",
            decoding: "async"
        });
        return el("picture", {}, [el("source", { type: "image/webp", srcset: srcset("webp"), sizes }), img]);
    };

    let activeOverlay = null;
    let lastFocus = null;

    const focusables = (root) =>
        [...root.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')]
            .filter((node) => node.offsetParent !== null || node === document.activeElement);

    const openOverlay = (overlay) => {
        lastFocus = document.activeElement;
        activeOverlay = overlay;
        overlay.hidden = false;
        document.body.classList.add("no-scroll");
        requestAnimationFrame(() => {
            overlay.classList.add("is-open");
            const first = overlay.querySelector("[data-autofocus]") || focusables(overlay)[0];
            if (first) first.focus({ preventScroll: true });
        });
    };

    const closeOverlay = (overlay = activeOverlay) => {
        if (!overlay) return;
        overlay.classList.remove("is-open");
        document.body.classList.remove("no-scroll");
        activeOverlay = null;
        const finish = () => {
            if (!overlay.classList.contains("is-open")) overlay.hidden = true;
        };
        if (reducedMotion.matches) finish();
        else overlay.addEventListener("transitionend", finish, { once: true });
        if (lastFocus) lastFocus.focus({ preventScroll: true });
    };

    document.addEventListener("keydown", (event) => {
        if (!activeOverlay) return;
        if (event.key === "Escape") {
            event.preventDefault();
            closeOverlay();
        }
        if (event.key === "Tab") {
            const items = focusables(activeOverlay);
            if (!items.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });

    const observeReveal = (root = document) => {
        const items = root.querySelectorAll(".reveal:not(.is-visible)");
        if (!("IntersectionObserver" in window) || reducedMotion.matches) {
            items.forEach((item) => item.classList.add("is-visible"));
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
        );
        items.forEach((item) => observer.observe(item));
    };

    return { el, icons, formatRand, createPicture, openOverlay, closeOverlay, observeReveal, reducedMotion };
})();

const initHeader = () => {
    const header = document.querySelector(".site-header");
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("main-nav");
    if (!header || !toggle || !nav) return;

    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const setOpen = (open) => {
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        nav.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (event) => {
        if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && nav.classList.contains("is-open")) {
            setOpen(false);
            toggle.focus();
        }
    });
    window.matchMedia("(min-width: 56.01rem)").addEventListener("change", (event) => {
        if (event.matches) setOpen(false);
    });
};

const initStagger = () => {
    document.querySelectorAll("[data-stagger]").forEach((group) => {
        [...group.children].forEach((child, index) => {
            child.classList.add("reveal");
            child.style.setProperty("--delay", `${index * 90}ms`);
        });
    });
};

const initAccordions = () => {
    document.querySelectorAll("[data-accordion]").forEach((accordion) => {
        const triggers = accordion.querySelectorAll(".accordion-trigger");
        triggers.forEach((trigger) => {
            trigger.addEventListener("click", () => {
                const expanded = trigger.getAttribute("aria-expanded") === "true";
                if (accordion.dataset.accordion === "single") {
                    triggers.forEach((other) => {
                        other.setAttribute("aria-expanded", "false");
                        document.getElementById(other.getAttribute("aria-controls")).classList.remove("is-open");
                    });
                }
                trigger.setAttribute("aria-expanded", String(!expanded));
                document.getElementById(trigger.getAttribute("aria-controls")).classList.toggle("is-open", !expanded);
            });
        });
    });
};

const initTabs = () => {
    document.querySelectorAll("[data-tabs]").forEach((tabs) => {
        const buttons = [...tabs.querySelectorAll('[role="tab"]')];
        const select = (button) => {
            buttons.forEach((other) => {
                const selected = other === button;
                other.setAttribute("aria-selected", String(selected));
                other.tabIndex = selected ? 0 : -1;
                document.getElementById(other.getAttribute("aria-controls")).hidden = !selected;
            });
        };
        buttons.forEach((button, index) => {
            button.addEventListener("click", () => select(button));
            button.addEventListener("keydown", (event) => {
                const keys = { ArrowRight: 1, ArrowLeft: -1 };
                if (!(event.key in keys)) return;
                event.preventDefault();
                const target = buttons[(index + keys[event.key] + buttons.length) % buttons.length];
                select(target);
                target.focus();
            });
        });
    });
};

const initLightbox = () => {
    const items = [...document.querySelectorAll("[data-lightbox]")];
    if (!items.length) return;

    const image = SC.el("img", { alt: "", className: "is-loading" });
    const caption = SC.el("figcaption", { id: "lightbox-caption" });
    const counter = SC.el("p", { className: "lightbox-count", "aria-live": "polite" });
    const close = SC.el("button", { type: "button", className: "overlay-btn overlay-close", "aria-label": "Close image viewer", "data-autofocus": true });
    const prev = SC.el("button", { type: "button", className: "overlay-btn overlay-prev", "aria-label": "Previous image" });
    const next = SC.el("button", { type: "button", className: "overlay-btn overlay-next", "aria-label": "Next image" });
    close.innerHTML = SC.icons.close;
    prev.innerHTML = SC.icons.prev;
    next.innerHTML = SC.icons.next;

    const overlay = SC.el(
        "div",
        { className: "overlay", role: "dialog", "aria-modal": "true", "aria-label": "Image viewer", hidden: true },
        [counter, close, prev, SC.el("figure", { className: "lightbox-figure" }, [image, caption]), next]
    );
    document.body.append(overlay);

    let current = 0;

    const show = (index) => {
        current = (index + items.length) % items.length;
        const item = items[current];
        image.classList.add("is-loading");
        const loader = new Image();
        loader.onload = () => {
            image.src = loader.src;
            image.alt = item.querySelector("img").alt;
            image.classList.remove("is-loading");
        };
        loader.src = item.dataset.full;
        caption.textContent = item.dataset.caption || "";
        counter.textContent = `${current + 1} / ${items.length}`;
        [items[current - 1], items[current + 1]].forEach((neighbour) => {
            if (neighbour) new Image().src = neighbour.dataset.full;
        });
    };

    items.forEach((item, index) => {
        item.addEventListener("click", () => {
            show(index);
            SC.openOverlay(overlay);
        });
    });

    close.addEventListener("click", () => SC.closeOverlay(overlay));
    prev.addEventListener("click", () => show(current - 1));
    next.addEventListener("click", () => show(current + 1));
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) SC.closeOverlay(overlay);
    });
    overlay.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") show(current - 1);
        if (event.key === "ArrowRight") show(current + 1);
    });

    let touchStart = null;
    overlay.addEventListener("touchstart", (event) => {
        touchStart = event.changedTouches[0].clientX;
    }, { passive: true });
    overlay.addEventListener("touchend", (event) => {
        if (touchStart === null) return;
        const distance = event.changedTouches[0].clientX - touchStart;
        if (Math.abs(distance) > 50) show(current + (distance < 0 ? 1 : -1));
        touchStart = null;
    });
};

const initShareLinks = () => {
    const url = encodeURIComponent(window.location.href.split("#")[0]);
    const text = encodeURIComponent("Fresh cakes, cupcakes and pastries from Sweet Crumbs Bakery in Pretoria");
    document.querySelectorAll("[data-share]").forEach((link) => {
        const targets = {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
            whatsapp: `https://wa.me/?text=${text}%20${url}`,
            x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`
        };
        link.href = targets[link.dataset.share];
    });
};

document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initStagger();
    initAccordions();
    initTabs();
    initLightbox();
    initShareLinks();
    document.querySelectorAll("[data-year]").forEach((node) => {
        node.textContent = new Date().getFullYear();
    });
    SC.observeReveal();
});
