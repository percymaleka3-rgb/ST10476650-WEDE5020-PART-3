document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("enquiry-form");
    if (!form) return;

    const { el, formatRand } = SC;
    const { checks, create, counter, toISODate, parseISODate, startOfToday, addDays, reference } = FormKit;
    const products = SC_DATA.products;
    const productSelect = form.elements.product;
    const dateInput = form.elements.date;
    const result = document.getElementById("enquiry-result");
    const status = form.querySelector(".form-status");
    const submit = form.querySelector('[type="submit"]');
    const deliveryBlock = document.getElementById("delivery-fields");
    const collectBlock = document.getElementById("collection-fields");

    const today = startOfToday();
    const maxDate = addDays(today, 90);
    dateInput.min = toISODate(today);
    dateInput.max = toISODate(maxDate);

    SC_DATA.categories.filter((category) => category.id !== "all").forEach((category) => {
        const group = el("optgroup", { label: category.label });
        products
            .filter((product) => product.category === category.id)
            .forEach((product) => group.append(el("option", { value: product.id, text: `${product.name} (${formatRand(product.price)} ${product.unit})` })));
        productSelect.append(group);
    });

    const requested = new URLSearchParams(window.location.search).get("product");
    if (products.some((product) => product.id === requested)) productSelect.value = requested;

    const findProduct = (id) => products.find((product) => product.id === id);

    const minimumQuantity = (product) => (product && product.category === "cupcakes" ? 6 : 1);

    const updateFulfilment = () => {
        const method = form.elements.fulfilment.value;
        deliveryBlock.classList.toggle("is-shown", method === "delivery");
        collectBlock.classList.toggle("is-shown", method === "collect");
        deliveryBlock.querySelectorAll("input, select, textarea").forEach((input) => {
            input.disabled = method !== "delivery";
        });
        collectBlock.querySelectorAll("input, select, textarea").forEach((input) => {
            input.disabled = method !== "collect";
        });
    };
    [...form.elements.fulfilment].forEach((radio) => radio.addEventListener("change", updateFulfilment));
    updateFulfilment();

    counter(form.elements.notes, document.getElementById("notes-count"));

    const validator = create(form, {
        fullName: (value) => checks.name(value),
        email: (value) => checks.email(value),
        phone: (value) => checks.phone(value),
        product: (value) => (value ? "" : "Please choose the treat you are interested in."),
        quantity: (value, get) => {
            const product = findProduct(get("product"));
            const min = minimumQuantity(product);
            if (value === "") return "Please enter a quantity.";
            if (!/^\d+$/.test(value)) return "Quantity must be a whole number.";
            const amount = Number(value);
            if (amount < min) return product && min > 1 ? `${product.name} have a minimum order of ${min}.` : "Quantity must be at least 1.";
            if (amount > 100) return "For more than 100 items please call us on 012 555 4441.";
            return "";
        },
        date: (value) => {
            if (!value) return "Please choose the date you need your order.";
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Enter the date in the format YYYY-MM-DD.";
            const chosen = parseISODate(value);
            if (chosen < today) return "This date has already passed. Please choose a future date.";
            if (chosen > maxDate) return "We take orders up to 90 days in advance.";
            return "";
        },
        fulfilment: (value) => (value ? "" : "Please choose collection or delivery."),
        branch: (value, get) => (get("fulfilment") === "collect" && !value ? "Please choose the branch you will collect from." : ""),
        address: (value, get) => {
            if (get("fulfilment") !== "delivery") return "";
            return checks.length(value, 10, 160, "your delivery address");
        },
        notes: (value) => (value.length > 500 ? "Please keep your notes under 500 characters." : ""),
        consent: (value) => (value ? "" : "Please allow us to contact you about this enquiry.")
    });

    productSelect.addEventListener("change", () => {
        if (form.elements.quantity.value) validator.validateField("quantity");
    });
    [...form.elements.fulfilment].forEach((radio) =>
        radio.addEventListener("change", () => {
            validator.clearField("branch");
            validator.clearField("address");
        })
    );

    const nextOpenDay = (date) => {
        let day = date;
        while (!SC_DATA.hours[day.getDay()]) day = addDays(day, 1);
        return day;
    };

    const formatDate = (date) =>
        date.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const buildQuote = () => {
        const product = findProduct(validator.value("product"));
        const quantity = Number(validator.value("quantity"));
        const chosen = parseISODate(validator.value("date"));
        const delivery = validator.value("fulfilment") === "delivery";
        const subtotal = product.price * quantity;
        const discount = subtotal >= 1000 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
        const deliveryFee = delivery ? (subtotal - discount >= 500 ? 0 : 65) : 0;
        const leadDays = product.leadDays + (quantity > 24 ? 1 : 0);
        const earliest = nextOpenDay(addDays(today, leadDays));
        const closedDay = !SC_DATA.hours[chosen.getDay()];
        const available = chosen >= earliest && !closedDay;
        const branch = SC_DATA.branches.find((b) => b.id === validator.value("branch"));
        let message;
        if (available) {
            message = delivery
                ? `Great news, we can bake and deliver this on ${formatDate(chosen)}. Deliveries go out between 09:00 and 13:00.`
                : `Great news, this will be ready for collection at our ${branch.name} branch on ${formatDate(chosen)} from 10:00.`;
        } else if (closedDay) {
            message = `We are closed on Sundays. The closest available day is ${formatDate(nextOpenDay(chosen < earliest ? earliest : chosen))}.`;
        } else {
            message = `This order needs ${leadDays} ${leadDays === 1 ? "day" : "days"} to prepare, so the earliest date we can offer is ${formatDate(earliest)}.`;
        }
        return {
            reference: reference("SC"),
            product,
            quantity,
            chosen,
            delivery,
            subtotal,
            discount,
            deliveryFee,
            total: subtotal - discount + deliveryFee,
            available,
            message
        };
    };

    const row = (label, value, className) => el("div", { className }, [el("dt", { text: label }), el("dd", { text: value })]);

    const mailtoFor = (quote) => {
        const lines = [
            `Enquiry reference: ${quote.reference}`,
            `Name: ${validator.value("fullName")}`,
            `Email: ${validator.value("email")}`,
            `Phone: ${validator.value("phone")}`,
            `Product: ${quote.product.name}`,
            `Quantity: ${quote.quantity}`,
            `Date needed: ${formatDate(quote.chosen)}`,
            `Fulfilment: ${quote.delivery ? `Delivery to ${validator.value("address")}` : `Collect from ${SC_DATA.branches.find((b) => b.id === validator.value("branch")).name}`}`,
            `Occasion: ${validator.value("occasion") || "Not specified"}`,
            `Estimated total: ${formatRand(quote.total)}`,
            "",
            `Notes: ${validator.value("notes") || "None"}`
        ];
        return `mailto:${SC_DATA.email}?subject=${encodeURIComponent(`Order enquiry ${quote.reference}: ${quote.product.name}`)}&body=${encodeURIComponent(lines.join("\n"))}`;
    };

    const renderQuote = (quote) => {
        const breakdown = el("dl", { className: "breakdown" }, [
            row(`${quote.quantity} × ${quote.product.name} (${formatRand(quote.product.price)} ${quote.product.unit})`, formatRand(quote.subtotal)),
            quote.discount ? row("Large order discount (10%)", `−${formatRand(quote.discount)}`) : null,
            quote.delivery ? row("Delivery within Pretoria", quote.deliveryFee ? formatRand(quote.deliveryFee) : "Free") : null,
            row("Estimated total", formatRand(quote.total), "total")
        ]);
        const restart = el("button", { type: "button", className: "btn btn-ghost", text: "Start a new enquiry" });
        restart.addEventListener("click", () => {
            form.reset();
            validator.reset();
            updateFulfilment();
            result.hidden = true;
            status.textContent = "";
            form.elements.fullName.focus();
        });
        result.replaceChildren(
            el("span", { className: `status-pill ${quote.available ? "ok" : "warn"}`, text: quote.available ? "Available" : "Not available on this date" }),
            el("h3", { text: `Your estimate: ${formatRand(quote.total)}` }),
            el("p", { text: quote.message }),
            breakdown,
            el("p", { className: "hint", text: `Reference ${quote.reference}. Prices include VAT. Final pricing is confirmed by our team within one working day.` }),
            el("div", { className: "actions" }, [el("a", { className: "btn", href: mailtoFor(quote), text: "Email this enquiry to us" }), restart])
        );
        result.hidden = false;
        result.style.animation = "none";
        result.offsetHeight;
        result.style.animation = "";
        result.scrollIntoView({ behavior: SC.reducedMotion.matches ? "auto" : "smooth", block: "nearest" });
    };

    const endpointReady = () => !form.action.includes("your-form-id");

    const sendEnquiry = async (quote) => {
        const data = new FormData(form);
        data.append("reference", quote.reference);
        data.append("estimated_total", formatRand(quote.total));
        data.append("availability", quote.available ? "Available" : "Not available on requested date");
        const response = await fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    };

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        status.className = "form-status";
        const firstInvalid = validator.validateAll();
        if (firstInvalid) {
            status.classList.add("is-error");
            status.textContent = "Please fix the highlighted fields.";
            firstInvalid.focus();
            return;
        }

        const quote = buildQuote();
        renderQuote(quote);

        if (!endpointReady()) {
            status.textContent = "";
            return;
        }

        submit.disabled = true;
        status.textContent = "Sending your enquiry…";
        try {
            await sendEnquiry(quote);
            status.classList.add("is-success");
            status.textContent = `Enquiry ${quote.reference} sent. We will reply to ${validator.value("email")} within one working day.`;
        } catch (error) {
            status.classList.add("is-error");
            status.textContent = "We could not send your enquiry online. Please use the email button below or call 012 555 4441.";
        } finally {
            submit.disabled = false;
        }
    });
});
