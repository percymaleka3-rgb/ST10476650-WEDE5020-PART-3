const ProductCatalogue = (() => {
    const { el, createPicture, formatRand, openOverlay, closeOverlay, icons } = SC;
    const products = SC_DATA.products;
    const categoryLabel = (id) => SC_DATA.categories.find((category) => category.id === id).label;
    const leadText = (days) => (days === 1 ? "Order 1 day ahead" : `Order ${days} days ahead`);

    let modal;
    let modalContent;

    const buildModal = () => {
        const close = el("button", { type: "button", className: "overlay-btn modal-close", "aria-label": "Close product details", "data-autofocus": true });
        close.innerHTML = icons.close;
        modalContent = el("div", { className: "modal-panel" });
        modal = el("div", { className: "overlay", role: "dialog", "aria-modal": "true", "aria-labelledby": "modal-title", hidden: true }, [modalContent]);
        modalContent.append(close);
        close.addEventListener("click", () => closeOverlay(modal));
        modal.addEventListener("click", (event) => {
            if (event.target === modal) closeOverlay(modal);
        });
        document.body.append(modal);
    };

    const openQuickView = (product) => {
        if (!modal) buildModal();
        [...modalContent.children].slice(1).forEach((child) => child.remove());
        const details = el("dl", { className: "detail-list" }, [
            el("div", {}, [el("dt", { text: "Category" }), el("dd", { text: categoryLabel(product.category) })]),
            el("div", {}, [el("dt", { text: "Portion" }), el("dd", { text: product.serves })]),
            el("div", {}, [el("dt", { text: "Lead time" }), el("dd", { text: leadText(product.leadDays) })])
        ]);
        const body = el("div", { className: "modal-body" }, [
            el("p", { className: "category-label", text: categoryLabel(product.category) }),
            el("h2", { id: "modal-title", text: product.name }),
            el("p", { className: "price" }, [formatRand(product.price) + " ", el("small", { text: product.unit })]),
            el("p", { text: product.description }),
            details,
            el("div", { className: "hero-actions" }, [
                el("a", { className: "btn", href: `enquiry.html?product=${product.id}`, text: "Get a quote" }),
                el("button", { type: "button", className: "btn btn-ghost", text: "Keep browsing", "data-close": true })
            ])
        ]);
        body.querySelector("[data-close]").addEventListener("click", () => closeOverlay(modal));
        modalContent.append(
            createPicture({ ...product, widths: product.widths, sizes: "(max-width: 56rem) 100vw, 27rem", eager: true }),
            body
        );
        openOverlay(modal);
    };

    const card = (product, index) => {
        const viewButton = el("button", { type: "button", className: "btn btn-small btn-ghost", text: "View", "aria-label": `View ${product.name}` });
        viewButton.addEventListener("click", () => openQuickView(product));
        const article = el("article", { className: "product-card is-entering" }, [
            el("div", { className: "media" }, [
                createPicture({ ...product, sizes: "(max-width: 40rem) 100vw, (max-width: 64rem) 50vw, 18rem" }),
                el("span", { className: "tag", text: product.category })
            ]),
            el("div", { className: "body" }, [
                el("h3", { text: product.name }),
                el("p", { text: product.description }),
                el("div", { className: "meta" }, [
                    el("p", { className: "price" }, [formatRand(product.price) + " ", el("small", { text: product.unit })]),
                    viewButton
                ])
            ])
        ]);
        article.style.setProperty("--delay", `${Math.min(index, 8) * 60}ms`);
        return article;
    };

    const renderFeatured = (container) => {
        const excluded = (container.dataset.exclude || "").split(",");
        const featured = products
            .filter((product) => !excluded.includes(product.id))
            .sort((a, b) => a.popularity - b.popularity)
            .slice(0, Number(container.dataset.featured) || 4);
        container.replaceChildren(...featured.map(card));
    };

    const initCatalogue = (root) => {
        const grid = root.querySelector("[data-product-grid]");
        const search = root.querySelector("#product-search");
        const sort = root.querySelector("#product-sort");
        const chipsHost = root.querySelector("[data-category-chips]");
        const count = root.querySelector("[data-results-count]");
        const params = new URLSearchParams(window.location.search);
        const state = {
            category: SC_DATA.categories.some((c) => c.id === params.get("category")) ? params.get("category") : "all",
            query: (params.get("q") || "").slice(0, 60),
            sort: params.get("sort") || "popular"
        };

        search.value = state.query;
        if ([...sort.options].some((option) => option.value === state.sort)) sort.value = state.sort;

        const chips = SC_DATA.categories.map((category) => {
            const chip = el("button", { type: "button", className: "chip", text: category.label, "aria-pressed": String(category.id === state.category) });
            chip.addEventListener("click", () => {
                state.category = category.id;
                chips.forEach((other) => other.setAttribute("aria-pressed", String(other === chip)));
                update();
            });
            return chip;
        });
        chipsHost.replaceChildren(...chips);

        const sorters = {
            popular: (a, b) => a.popularity - b.popularity,
            "price-asc": (a, b) => a.price - b.price,
            "price-desc": (a, b) => b.price - a.price,
            name: (a, b) => a.name.localeCompare(b.name)
        };

        const matches = (product, terms) => {
            const haystack = `${product.name} ${product.description} ${product.category} ${product.keywords}`.toLowerCase();
            return terms.every((term) => haystack.includes(term));
        };

        const syncUrl = () => {
            const next = new URLSearchParams();
            if (state.category !== "all") next.set("category", state.category);
            if (state.query) next.set("q", state.query);
            if (state.sort !== "popular") next.set("sort", state.sort);
            const query = next.toString();
            history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
        };

        const update = () => {
            const terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);
            const results = products
                .filter((product) => state.category === "all" || product.category === state.category)
                .filter((product) => matches(product, terms))
                .sort(sorters[state.sort] || sorters.popular);

            if (results.length) {
                grid.replaceChildren(...results.map(card));
            } else {
                const reset = el("button", { type: "button", className: "btn btn-small", text: "Clear search and filters" });
                reset.addEventListener("click", () => {
                    state.category = "all";
                    state.query = "";
                    search.value = "";
                    chips.forEach((chip, index) => chip.setAttribute("aria-pressed", String(index === 0)));
                    update();
                });
                grid.replaceChildren(
                    el("div", { className: "empty-state" }, [
                        el("p", { text: `No treats match “${state.query}”. Try another word, or ask us about a custom order.` }),
                        el("div", { className: "center-actions" }, [reset])
                    ])
                );
            }
            count.textContent = `Showing ${results.length} of ${products.length} treats`;
            syncUrl();
        };

        let timer;
        search.addEventListener("input", () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                state.query = search.value.trim().slice(0, 60);
                update();
            }, 180);
        });
        root.querySelector("[data-search-form]").addEventListener("submit", (event) => event.preventDefault());
        sort.addEventListener("change", () => {
            state.sort = sort.value;
            update();
        });

        update();
    };

    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll("[data-featured]").forEach(renderFeatured);
        const catalogue = document.querySelector("[data-catalogue]");
        if (catalogue) initCatalogue(catalogue);
    });

    return { openQuickView };
})();
