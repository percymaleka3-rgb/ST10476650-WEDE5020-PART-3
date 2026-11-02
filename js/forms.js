const FormKit = (() => {
    const patterns = {
        name: /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
        phone: /^(?:\+27|0)\d{9}$/
    };

    const cleanPhone = (value) => value.replace(/[\s()-]/g, "");

    const checks = {
        name: (value) => {
            if (!value) return "Please enter your full name.";
            if (!patterns.name.test(value)) return "Use 2 to 60 letters. Spaces, hyphens and apostrophes are fine.";
            return "";
        },
        email: (value) => {
            if (!value) return "Please enter your email address.";
            if (!patterns.email.test(value)) return "Enter a valid email, for example name@example.co.za.";
            return "";
        },
        phone: (value, required = true) => {
            if (!value) return required ? "Please enter a phone number we can call." : "";
            if (!patterns.phone.test(cleanPhone(value))) return "Enter a 10-digit South African number, for example 082 123 4567 or +27 82 123 4567.";
            return "";
        },
        length: (value, min, max, label) => {
            if (!value) return `Please enter ${label}.`;
            if (value.length < min) return `Please add a little more detail (at least ${min} characters).`;
            if (value.length > max) return `Please keep this under ${max} characters.`;
            return "";
        }
    };

    const create = (form, rules) => {
        const touched = new Set();

        const control = (name) => form.elements[name];

        const wrapper = (name) => {
            const node = control(name);
            const first = node instanceof RadioNodeList ? node[0] : node;
            return first.closest(".field");
        };

        const value = (name) => {
            const node = control(name);
            if (node.type === "checkbox") return node.checked;
            return typeof node.value === "string" ? node.value.trim() : node.value;
        };

        const setState = (name, message) => {
            const field = wrapper(name);
            const node = control(name);
            const inputs = node instanceof RadioNodeList ? [...node] : [node];
            const error = field.querySelector(".error-message");
            field.classList.toggle("has-error", Boolean(message));
            field.classList.toggle("is-valid", !message && value(name) !== "" && value(name) !== false);
            inputs.forEach((input) => input.setAttribute("aria-invalid", String(Boolean(message))));
            if (error) error.textContent = message;
        };

        const validateField = (name) => {
            const message = rules[name](value(name), value) || "";
            setState(name, message);
            return message;
        };

        const clearField = (name) => {
            const field = wrapper(name);
            field.classList.remove("has-error", "is-valid");
            const error = field.querySelector(".error-message");
            if (error) error.textContent = "";
        };

        const validateAll = () => {
            let firstInvalid = null;
            Object.keys(rules).forEach((name) => {
                touched.add(name);
                if (validateField(name) && !firstInvalid) {
                    const node = control(name);
                    firstInvalid = node instanceof RadioNodeList ? node[0] : node;
                }
            });
            return firstInvalid;
        };

        Object.keys(rules).forEach((name) => {
            const node = control(name);
            const inputs = node instanceof RadioNodeList ? [...node] : [node];
            inputs.forEach((input) => {
                input.addEventListener("blur", () => {
                    if (value(name) !== "" || touched.has(name)) {
                        touched.add(name);
                        validateField(name);
                    }
                });
                input.addEventListener(input.type === "checkbox" || input.type === "radio" || input.tagName === "SELECT" ? "change" : "input", () => {
                    if (touched.has(name)) validateField(name);
                });
            });
        });

        form.setAttribute("novalidate", "");

        return {
            value,
            validateField,
            validateAll,
            clearField,
            reset: () => {
                touched.clear();
                Object.keys(rules).forEach(clearField);
            }
        };
    };

    const counter = (textarea, output) => {
        const max = Number(textarea.getAttribute("maxlength"));
        const update = () => {
            output.textContent = `${textarea.value.length} / ${max}`;
        };
        textarea.addEventListener("input", update);
        update();
    };

    const toISODate = (date) => {
        const pad = (n) => String(n).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };

    const parseISODate = (value) => {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
    };

    const startOfToday = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    };

    const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

    const reference = (prefix) => {
        const random = new Uint16Array(1);
        crypto.getRandomValues(random);
        const stamp = toISODate(new Date()).slice(2).replaceAll("-", "");
        return `${prefix}-${stamp}-${String(random[0] % 10000).padStart(4, "0")}`;
    };

    return { patterns, checks, cleanPhone, create, counter, toISODate, parseISODate, startOfToday, addDays, reference };
})();
