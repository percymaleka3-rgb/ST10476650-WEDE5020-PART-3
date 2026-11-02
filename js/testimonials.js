document.addEventListener("DOMContentLoaded", () => {
    const list = document.querySelector("[data-reviews]");
    if (!list) return;

    const { el } = SC;
    const reviews = [...SC_DATA.testimonials].sort((a, b) => b.month.localeCompare(a.month));
    const filter = document.getElementById("review-filter");
    const more = document.querySelector("[data-more-reviews]");
    const summary = document.querySelector("[data-rating-summary]");
    const pageSize = 6;
    let visible = pageSize;

    const stars = (rating) => el("span", { className: "stars", "aria-label": `${rating} out of 5 stars`, text: "★".repeat(rating) + "☆".repeat(5 - rating) });
    const tints = ["tint-pink", "tint-butter", "tint-sage"];

    const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    summary.replaceChildren(
        el("strong", { text: average.toFixed(1) }),
        el("div", {}, [stars(Math.round(average)), el("p", { text: `Based on ${reviews.length} customer reviews` })])
    );

    const card = (review, index) => {
        const month = new Date(`${review.month}-01T00:00:00`).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
        const node = el("article", { className: "card quote-card is-entering" }, [
            stars(review.rating),
            el("blockquote", {}, [el("p", { text: `“${review.quote}”` })]),
            el("footer", {}, [
                el("span", { className: `avatar ${tints[index % tints.length]}`, "aria-hidden": "true", text: review.name.charAt(0) }),
                el("div", {}, [el("cite", { text: review.name }), el("small", { text: `${review.product} · ${month}` })])
            ])
        ]);
        node.style.setProperty("--delay", `${(index % pageSize) * 70}ms`);
        return node;
    };

    const filtered = () => {
        const value = filter.value;
        if (value === "5") return reviews.filter((review) => review.rating === 5);
        if (value === "cakes") return reviews.filter((review) => /cake/i.test(review.product));
        if (value === "other") return reviews.filter((review) => !/cake/i.test(review.product));
        return reviews;
    };

    const render = () => {
        const items = filtered();
        list.replaceChildren(...items.slice(0, visible).map(card));
        more.hidden = visible >= items.length;
        document.querySelector("[data-review-count]").textContent = `Showing ${Math.min(visible, items.length)} of ${items.length} reviews`;
    };

    filter.addEventListener("change", () => {
        visible = pageSize;
        render();
    });

    more.addEventListener("click", () => {
        const start = visible;
        visible += pageSize;
        render();
        const quote = list.children[start] && list.children[start].querySelector("blockquote");
        if (quote) {
            quote.setAttribute("tabindex", "-1");
            quote.focus({ preventScroll: true });
        }
    });

    render();
});
