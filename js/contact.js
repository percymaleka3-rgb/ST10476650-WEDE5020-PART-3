const initContactForm = () => {
    const form = document.getElementById("contact-form");
    if (!form) return;

    const { el } = SC;
    const { checks, create, counter, reference } = FormKit;
    const result = document.getElementById("contact-result");
    const status = form.querySelector(".form-status");
    const recipient = SC_DATA.email;

    counter(form.elements.message, document.getElementById("message-count"));

    const requestedType = new URLSearchParams(window.location.search).get("type");
    if ([...form.elements.messageType.options].some((option) => option.value === requestedType)) {
        form.elements.messageType.value = requestedType;
    }

    const validator = create(form, {
        fullName: (value) => checks.name(value),
        email: (value) => checks.email(value),
        phone: (value) => checks.phone(value, false),
        messageType: (value) => (value ? "" : "Please choose what your message is about."),
        subject: (value) => checks.length(value, 3, 80, "a subject"),
        message: (value) => checks.length(value, 20, 1000, "your message")
    });

    const buildEmail = () => {
        const ref = reference("MSG");
        const type = form.elements.messageType.selectedOptions[0].textContent;
        const subject = `[${type}] ${validator.value("subject")}`;
        const body = [
            `Hello Sweet Crumbs Bakery,`,
            "",
            validator.value("message"),
            "",
            "Kind regards,",
            validator.value("fullName"),
            "",
            `Email: ${validator.value("email")}`,
            `Phone: ${validator.value("phone") || "Not provided"}`,
            `Message type: ${type}`,
            `Reference: ${ref}`
        ].join("\n");
        return { ref, type, subject, body, href: `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
    };

    const renderSummary = (email) => {
        const copy = el("button", { type: "button", className: "btn btn-ghost", text: "Copy message" });
        copy.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(`To: ${recipient}\nSubject: ${email.subject}\n\n${email.body}`);
                copy.textContent = "Copied";
            } catch (error) {
                copy.textContent = "Copy not available";
            }
            setTimeout(() => {
                copy.textContent = "Copy message";
            }, 2200);
        });
        result.replaceChildren(
            el("span", { className: "status-pill ok", text: "Email ready" }),
            el("h3", { text: "Your email app should now be open" }),
            el("p", { text: `We have compiled your ${email.type.toLowerCase()} message to ${recipient}. Press send in your email app to deliver it. We reply within one working day.` }),
            el("dl", { className: "breakdown" }, [
                el("div", {}, [el("dt", { text: "To" }), el("dd", { text: recipient })]),
                el("div", {}, [el("dt", { text: "Subject" }), el("dd", { text: email.subject })]),
                el("div", {}, [el("dt", { text: "Reference" }), el("dd", { text: email.ref })])
            ]),
            el("div", { className: "actions" }, [el("a", { className: "btn", href: email.href, text: "Open email again" }), copy])
        );
        result.hidden = false;
        result.scrollIntoView({ behavior: SC.reducedMotion.matches ? "auto" : "smooth", block: "nearest" });
    };

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        status.className = "form-status";
        const firstInvalid = validator.validateAll();
        if (firstInvalid) {
            status.classList.add("is-error");
            status.textContent = "Please fix the highlighted fields.";
            firstInvalid.focus();
            return;
        }
        const email = buildEmail();
        renderSummary(email);
        status.textContent = "";
        window.location.href = email.href;
    });
};

const initMap = () => {
    const container = document.getElementById("map");
    if (!container) return;
    const buttons = [...document.querySelectorAll("[data-branch]")];

    if (typeof L === "undefined") {
        container.replaceChildren(SC.el("p", { className: "map-fallback", text: "The map could not load. Find us at 123 Pretorius Street, Pretoria Central and 45 Burnett Street, Hatfield." }));
        return;
    }

    const map = L.map(container, { scrollWheelZoom: false, zoomControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer" target="_blank">OpenStreetMap</a> contributors'
    }).addTo(map);

    const icon = L.divIcon({ className: "", html: '<div class="map-pin"><span></span></div>', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] });

    const markers = {};
    SC_DATA.branches.forEach((branch) => {
        const popup = SC.el("div", {}, [
            SC.el("strong", { text: `Sweet Crumbs ${branch.name}` }),
            SC.el("br"),
            branch.address,
            SC.el("br"),
            SC.el("a", { href: `tel:${branch.phone.replace(/\s/g, "")}`, text: branch.phone }),
            SC.el("br"),
            SC.el("a", {
                href: `https://www.openstreetmap.org/directions?to=${branch.coords.join(",")}`,
                target: "_blank",
                rel: "noopener noreferrer",
                text: "Get directions"
            })
        ]);
        markers[branch.id] = L.marker(branch.coords, { icon, title: `Sweet Crumbs ${branch.name}`, alt: `Map marker for Sweet Crumbs ${branch.name}` })
            .addTo(map)
            .bindPopup(popup);
    });

    const bounds = L.latLngBounds(SC_DATA.branches.map((branch) => branch.coords));
    map.fitBounds(bounds, { padding: [60, 60] });

    const select = (id) => {
        const branch = SC_DATA.branches.find((b) => b.id === id);
        buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.branch === id)));
        map.flyTo(branch.coords, 16, { duration: SC.reducedMotion.matches ? 0 : 1.2 });
        map.once("moveend", () => markers[id].openPopup());
    };

    buttons.forEach((button) => button.addEventListener("click", () => select(button.dataset.branch)));

    const showAll = document.querySelector("[data-show-all]");
    if (showAll) {
        showAll.addEventListener("click", () => {
            buttons.forEach((button) => button.setAttribute("aria-pressed", "false"));
            map.closePopup();
            map.flyToBounds(bounds, { padding: [60, 60], duration: SC.reducedMotion.matches ? 0 : 1.2 });
        });
    }

    map.on("focus", () => map.scrollWheelZoom.enable());
    map.on("blur", () => map.scrollWheelZoom.disable());
};

document.addEventListener("DOMContentLoaded", () => {
    initContactForm();
    initMap();
});
