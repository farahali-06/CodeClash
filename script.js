(() => {
    const storageKey = "roktolinkDonorRegistrations";
    const form = document.getElementById("donor-registration-form");
    const status = document.getElementById("registration-status");

    if (!form && !status) {
        return;
    }

    if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement)) {
        console.error("RoktoLink registration form or status message is missing.");
        return;
    }

    function createRegistrationId(registrations) {
        let id;

        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            id = window.crypto.randomUUID();
        } else if (window.crypto && typeof window.crypto.getRandomValues === "function") {
            const values = new Uint32Array(2);
            window.crypto.getRandomValues(values);
            id = `rl-${Date.now()}-${values[0].toString(16)}${values[1].toString(16)}`;
        } else {
            id = `rl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }

        let uniqueId = id;
        let suffix = 1;
        while (registrations.some((registration) => registration && registration.id === uniqueId)) {
            uniqueId = `${id}-${suffix++}`;
        }

        return uniqueId;
    }

    function showStatus(message, state) {
        status.textContent = message;
        status.className = `registration-status is-${state}`;
        status.hidden = false;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!form.reportValidity()) {
            return;
        }

        try {
            const storedValue = window.localStorage.getItem(storageKey);
            const registrations = storedValue === null ? [] : JSON.parse(storedValue);

            if (!Array.isArray(registrations)) {
                throw new Error("Stored registration data is not a list.");
            }

            const formData = new FormData(form);
            const registration = {
                id: createRegistrationId(registrations),
                displayName: formData.get("displayName"),
                bloodGroup: formData.get("bloodGroup"),
                city: formData.get("city"),
                locality: formData.get("locality"),
                availabilityPreference: formData.get("availabilityPreference"),
                registrationDate: new Date().toISOString(),
                status: "pending-review",
                recordType: "sample-unverified"
            };

            registrations.push(registration);
            window.localStorage.setItem(storageKey, JSON.stringify(registrations));

            form.reset();
            showStatus("Your sample registration has been saved successfully! It is pending review.", "success");
        } catch (error) {
            console.error("RoktoLink registration could not be saved.", error);
            showStatus("Could not save your registration in this browser. Check browser storage and try again.", "error");
        }
    });
})();

(() => {
    const donors = window.roktolinkSampleDonors;
    const form = document.getElementById("donor-search-form");
    const bloodGroup = document.getElementById("search-blood-group");
    const location = document.getElementById("search-location");
    const clearButton = document.getElementById("clear-search");
    const results = document.getElementById("donor-results");
    const status = document.getElementById("search-status");

    if (!form && !bloodGroup && !location && !clearButton && !results && !status) {
        return;
    }

    if (
        !(form instanceof HTMLFormElement) ||
        !(bloodGroup instanceof HTMLSelectElement) ||
        !(location instanceof HTMLInputElement) ||
        !(clearButton instanceof HTMLButtonElement) ||
        !(results instanceof HTMLElement) ||
        !(status instanceof HTMLElement)
    ) {
        console.error("RoktoLink donor search controls or results are missing.");
        return;
    }

    if (!Array.isArray(donors)) {
        console.error("RoktoLink sample donor directory is unavailable.");
        status.textContent = "The sample donor directory could not be loaded.";
        return;
    }

    const registrationsStorageKey = "roktolinkDonorRegistrations";

    function normalizeBloodGroup(value) {
        return typeof value === "string" ? value.replace(/\u2212/g, "-").trim().toUpperCase() : "";
    }

    function loadPublicProfiles() {
        const sampleProfiles = donors.map((donor) => ({ ...donor, profileType: "sample" }));

        try {
            const storedValue = window.localStorage.getItem(registrationsStorageKey);
            const registrations = storedValue === null ? [] : JSON.parse(storedValue);

            if (!Array.isArray(registrations)) {
                throw new Error("Stored donor registration data is not a list.");
            }

            const latestById = new Map();
            const dataWarnings = [];
            registrations.forEach((registration) => {
                if (!registration || typeof registration !== "object") {
                    throw new Error("Stored donor registration contains an invalid record.");
                }

                const id = typeof registration.id === "string" ? registration.id.trim() : "";
                if (!id) {
                    if (String(registration.status || "").toLowerCase() === "approved") {
                        console.warn("An approved donor registration without an ID was not included in public search.");
                        dataWarnings.push("An approved registration without an ID was omitted.");
                    }
                    return;
                }
                latestById.set(id, registration);
            });

            const approvedProfiles = [];
            latestById.forEach((registration, id) => {
                if (String(registration.status || "").toLowerCase() !== "approved") {
                    return;
                }

                const displayName = typeof registration.displayName === "string" ? registration.displayName.trim() : "";
                const city = typeof registration.city === "string" ? registration.city.trim() : "";
                const locality = typeof registration.locality === "string" ? registration.locality.trim() : "";
                const bloodGroup = normalizeBloodGroup(registration.bloodGroup);

                if (!displayName || !city || !locality || !bloodGroup) {
                    console.warn(`Approved donor registration ${id} is incomplete and was not included in public search.`);
                    dataWarnings.push("An incomplete approved registration was omitted.");
                } else {
                    approvedProfiles.push({
                        id: `registration-${id}`,
                        displayName,
                        bloodGroup,
                        city,
                        locality,
                        availabilityPreference: registration.availabilityPreference || "No preference stated",
                        profileType: "approved-registration"
                    });
                }
            });

            return {
                profiles: [...sampleProfiles, ...approvedProfiles],
                warning: dataWarnings.join(" ")
            };
        } catch (error) {
            console.error("Approved donor registrations could not be loaded for public search.", error);
            return {
                profiles: sampleProfiles,
                warning: "Approved registrations could not be loaded; showing fictional sample profiles only."
            };
        }
    }

    function getFilteredProfiles() {
        const directory = loadPublicProfiles();
        const selectedBloodGroup = normalizeBloodGroup(bloodGroup.value);
        const locationQuery = location.value.trim().toLowerCase();
        const filteredProfiles = directory.profiles.filter((donor) => {
            const matchesBloodGroup = selectedBloodGroup === "" ||
                normalizeBloodGroup(donor.bloodGroup) === selectedBloodGroup;
            const donorLocation = `${donor.city} ${donor.locality}`.toLowerCase();
            const matchesLocation = locationQuery === "" || donorLocation.includes(locationQuery);

            return matchesBloodGroup && matchesLocation;
        });

        return {
            profiles: filteredProfiles,
            total: directory.profiles.length,
            warning: directory.warning
        };
    }

    function renderDonors(profiles, total, warning) {
        results.replaceChildren();

        if (profiles.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "empty-results";
            emptyMessage.textContent = "Try a different blood group or location, or clear the filters.";
            results.append(emptyMessage);
            status.textContent = "No donor profiles match those filters.";
            if (warning) {
                status.textContent += ` ${warning}`;
            }
            return;
        }

        status.textContent = `Showing ${profiles.length} of ${total} donor profiles.`;
        if (warning) {
            status.textContent += ` ${warning}`;
        }

        profiles.forEach((donor) => {
            const card = document.createElement("article");
            card.className = "donor-card";

            const heading = document.createElement("div");
            heading.className = "donor-card-heading";

            const name = document.createElement("h4");
            name.className = "donor-name";
            name.textContent = donor.displayName;

            const group = document.createElement("span");
            group.className = "donor-blood-group";
            group.textContent = donor.bloodGroup;

            const sampleLabel = document.createElement("span");
            sampleLabel.className = "donor-sample-label";
            sampleLabel.textContent = donor.profileType === "approved-registration"
                ? "Approved demo registration"
                : "Fictional sample profile";

            const donorLocation = document.createElement("p");
            donorLocation.className = "donor-location";
            donorLocation.textContent = `${donor.city}, ${donor.locality}`;

            const preference = document.createElement("p");
            preference.className = "donor-preference";

            const preferenceLabel = document.createElement("span");
            preferenceLabel.className = "donor-preference-label";
            preferenceLabel.textContent = "Stated availability preference";

            const preferenceValue = document.createElement("span");
            preferenceValue.textContent = donor.availabilityPreference;

            heading.append(name, group);
            preference.append(preferenceLabel, preferenceValue);
            card.append(heading, sampleLabel, donorLocation, preference);
            results.append(card);
        });
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const directory = getFilteredProfiles();
        renderDonors(directory.profiles, directory.total, directory.warning);
    });

    clearButton.addEventListener("click", () => {
        form.reset();
        const directory = getFilteredProfiles();
        renderDonors(directory.profiles, directory.total, directory.warning);
    });

    const initialDirectory = getFilteredProfiles();
    renderDonors(initialDirectory.profiles, initialDirectory.total, initialDirectory.warning);

    window.addEventListener("storage", (event) => {
        if (event.key === registrationsStorageKey || event.key === null) {
            const directory = getFilteredProfiles();
            renderDonors(directory.profiles, directory.total, directory.warning);
        }
    });

    window.addEventListener("pageshow", () => {
        const directory = getFilteredProfiles();
        renderDonors(directory.profiles, directory.total, directory.warning);
    });
})();

(() => {
    const storageKey = "roktolinkBloodRequests";
    const form = document.getElementById("blood-request-form");
    const requiredBy = document.getElementById("required-by");
    const status = document.getElementById("blood-request-status");

    if (!form && !requiredBy && !status) {
        return;
    }

    if (
        !(form instanceof HTMLFormElement) ||
        !(requiredBy instanceof HTMLInputElement) ||
        !(status instanceof HTMLElement)
    ) {
        console.error("RoktoLink blood request form or status message is missing.");
        return;
    }

    function getLocalDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function updateRequiredByMinimum() {
        requiredBy.min = getLocalDateString();
    }

    function createRequestId(requests) {
        let id;

        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            id = `request-${window.crypto.randomUUID()}`;
        } else if (window.crypto && typeof window.crypto.getRandomValues === "function") {
            const values = new Uint32Array(2);
            window.crypto.getRandomValues(values);
            id = `request-${Date.now()}-${values[0].toString(16)}${values[1].toString(16)}`;
        } else {
            id = `request-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }

        let uniqueId = id;
        let suffix = 1;
        while (requests.some((request) => request && request.requestId === uniqueId)) {
            uniqueId = `${id}-${suffix++}`;
        }

        return uniqueId;
    }

    function showStatus(message, state) {
        status.textContent = message;
        status.className = `blood-request-status is-${state}`;
        status.hidden = false;
    }

    updateRequiredByMinimum();
    requiredBy.addEventListener("focus", updateRequiredByMinimum);

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        updateRequiredByMinimum();

        if (!form.reportValidity()) {
            return;
        }

        try {
            const storedValue = window.localStorage.getItem(storageKey);
            const requests = storedValue === null ? [] : JSON.parse(storedValue);

            if (!Array.isArray(requests)) {
                throw new Error("Stored blood request data is not a list.");
            }

            const formData = new FormData(form);
            const request = {
                requestId: createRequestId(requests),
                requesterName: formData.get("requesterName"),
                bloodGroup: formData.get("bloodGroup"),
                city: formData.get("city"),
                locality: formData.get("locality"),
                facilityName: formData.get("facilityName"),
                requiredBy: formData.get("requiredBy"),
                additionalMessage: formData.get("additionalMessage"),
                submittedAt: new Date().toISOString(),
                status: "Pending Demo Review"
            };

            requests.push(request);
            window.localStorage.setItem(storageKey, JSON.stringify(requests));

            form.reset();
            updateRequiredByMinimum();
            showStatus(
                `Your sample blood request has been submitted successfully. Request ID: ${request.requestId}. This is a demonstration only and does not notify hospitals or donors.`,
                "success"
            );
        } catch (error) {
            console.error("RoktoLink blood request could not be saved.", error);
            showStatus("Could not save your sample request in this browser. Check browser storage and try again.", "error");
        }
    });
})();

(() => {
    const root = document.getElementById("admin-dashboard");
    if (!root) {
        return;
    }

    const donorStorageKey = "roktolinkDonorRegistrations";
    const requestStorageKey = "roktolinkBloodRequests";
    const requestStatuses = ["Pending Demo Review", "Reviewed", "Closed"];
    const hasSampleDirectory = Array.isArray(window.roktolinkSampleDonors);
    const sampleDonors = hasSampleDirectory ? window.roktolinkSampleDonors : [];

    const elements = {
        message: document.getElementById("admin-message"),
        totalDonors: document.getElementById("stat-total-donors"),
        pendingRegistrations: document.getElementById("stat-pending-registrations"),
        approvedDonors: document.getElementById("stat-approved-donors"),
        totalRequests: document.getElementById("stat-total-requests"),
        donorSearch: document.getElementById("donor-name-filter"),
        donorBloodGroup: document.getElementById("donor-blood-filter"),
        donorStatus: document.getElementById("donor-status-filter"),
        donorTableBody: document.getElementById("donor-table-body"),
        requestSearch: document.getElementById("request-search-filter"),
        requestBloodGroup: document.getElementById("request-blood-filter"),
        requestStatus: document.getElementById("request-status-filter"),
        requestTableBody: document.getElementById("request-table-body")
    };

    const missingElement = Object.keys(elements).find((key) => !elements[key]);
    if (missingElement) {
        console.error(`RoktoLink admin dashboard element is missing: ${missingElement}.`);
        return;
    }

    function normalizeBloodGroup(value) {
        return typeof value === "string" ? value.replace(/\u2212/g, "-").trim().toUpperCase() : "";
    }

    function getDonorStatus(record) {
        const status = String(record.status || "").toLowerCase();
        if (status === "approved") {
            return "Approved";
        }
        if (status === "deactivated") {
            return "Deactivated";
        }
        if (status === "pending" || status === "pending-review") {
            return "Pending";
        }
        return "Unknown";
    }

    function loadRecords(key, label) {
        try {
            const storedValue = window.localStorage.getItem(key);
            const records = storedValue === null ? [] : JSON.parse(storedValue);

            if (!Array.isArray(records) || records.some((record) => !record || typeof record !== "object" || Array.isArray(record))) {
                throw new Error(`${label} data must be an array of records.`);
            }

            return { records, error: "" };
        } catch (error) {
            console.error(`${label} could not be loaded from LocalStorage.`, error);
            return {
                records: null,
                error: `${label} could not be loaded. Existing LocalStorage data was left unchanged.`
            };
        }
    }

    function uniqueRecords(records, idField) {
        const lastIndexById = new Map();
        records.forEach((record, index) => {
            const id = typeof record[idField] === "string" ? record[idField].trim() : "";
            if (id) {
                lastIndexById.set(id, index);
            }
        });

        return records.filter((record, index) => {
            const id = typeof record[idField] === "string" ? record[idField].trim() : "";
            return !id || lastIndexById.get(id) === index;
        });
    }

    function setAdminMessage(message, kind) {
        elements.message.textContent = message;
        elements.message.className = `admin-message ${kind ? `is-${kind}` : ""}`;
        elements.message.hidden = !message;
    }

    function createCell(value) {
        const cell = document.createElement("td");
        cell.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
        return cell;
    }

    function createStatusBadge(status) {
        const badge = document.createElement("span");
        badge.className = `admin-status-badge status-${status.toLowerCase().replace(/\s+/g, "-")}`;
        badge.textContent = status;
        return badge;
    }

    function createDonorAction(label, action, id) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `admin-action-button action-${action}`;
        button.textContent = label;
        button.dataset.action = action;
        button.dataset.recordId = id;
        return button;
    }

    function renderDonors(records, error) {
        elements.donorTableBody.replaceChildren();

        if (error) {
            const row = document.createElement("tr");
            const cell = createCell(error);
            cell.colSpan = 8;
            row.append(cell);
            elements.donorTableBody.append(row);
            return;
        }

        const donorNameQuery = elements.donorSearch.value.trim().toLowerCase();
        const selectedBloodGroup = normalizeBloodGroup(elements.donorBloodGroup.value);
        const selectedStatus = elements.donorStatus.value;
        const filteredRecords = uniqueRecords(records, "id").filter((record) => {
            const matchesName = String(record.displayName || "").toLowerCase().includes(donorNameQuery);
            const matchesBloodGroup = selectedBloodGroup === "" ||
                normalizeBloodGroup(record.bloodGroup) === selectedBloodGroup;
            const matchesStatus = selectedStatus === "" || getDonorStatus(record) === selectedStatus;
            return matchesName && matchesBloodGroup && matchesStatus;
        });

        if (filteredRecords.length === 0) {
            const row = document.createElement("tr");
            const cell = createCell(records.length === 0 ? "No donor registrations yet." : "No registrations match these filters.");
            cell.colSpan = 8;
            row.append(cell);
            elements.donorTableBody.append(row);
            return;
        }

        filteredRecords.forEach((record) => {
            const row = document.createElement("tr");
            const id = typeof record.id === "string" ? record.id : "";
            const status = getDonorStatus(record);

            row.append(
                createCell(id || "Missing ID"),
                createCell(record.displayName),
                createCell(normalizeBloodGroup(record.bloodGroup)),
                createCell(record.city),
                createCell(record.locality),
                createCell(record.availabilityPreference)
            );

            const statusCell = document.createElement("td");
            statusCell.append(createStatusBadge(status));
            row.append(statusCell);

            const actionsCell = document.createElement("td");
            actionsCell.className = "admin-actions-cell";
            if (id && status === "Pending") {
                actionsCell.append(createDonorAction("Approve", "approve", id));
            }
            if (id && status !== "Deactivated") {
                actionsCell.append(createDonorAction("Deactivate", "deactivate", id));
            }
            if (!actionsCell.hasChildNodes()) {
                actionsCell.textContent = "—";
            }
            row.append(actionsCell);
            elements.donorTableBody.append(row);
        });
    }

    function formatSubmissionDate(value) {
        if (typeof value !== "string") {
            return "—";
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
    }

    function renderRequests(records, error) {
        elements.requestTableBody.replaceChildren();

        if (error) {
            const row = document.createElement("tr");
            const cell = createCell(error);
            cell.colSpan = 9;
            row.append(cell);
            elements.requestTableBody.append(row);
            return;
        }

        const requestQuery = elements.requestSearch.value.trim().toLowerCase();
        const selectedBloodGroup = normalizeBloodGroup(elements.requestBloodGroup.value);
        const selectedStatus = elements.requestStatus.value;
        const filteredRecords = uniqueRecords(records, "requestId").filter((request) => {
            const matchesQuery = `${request.requestId || ""} ${request.requesterName || ""}`
                .toLowerCase()
                .includes(requestQuery);
            const matchesBloodGroup = selectedBloodGroup === "" ||
                normalizeBloodGroup(request.bloodGroup) === selectedBloodGroup;
            const matchesStatus = selectedStatus === "" || request.status === selectedStatus;
            return matchesQuery && matchesBloodGroup && matchesStatus;
        });

        if (filteredRecords.length === 0) {
            const row = document.createElement("tr");
            const cell = createCell(records.length === 0 ? "No blood requests yet." : "No requests match these filters.");
            cell.colSpan = 9;
            row.append(cell);
            elements.requestTableBody.append(row);
            return;
        }

        filteredRecords.forEach((request) => {
            const row = document.createElement("tr");
            const requestId = typeof request.requestId === "string" ? request.requestId : "";
            row.append(
                createCell(requestId || "Missing ID"),
                createCell(request.requesterName),
                createCell(normalizeBloodGroup(request.bloodGroup)),
                createCell(request.city),
                createCell(request.locality),
                createCell(request.facilityName),
                createCell(request.requiredBy),
                createCell(formatSubmissionDate(request.submittedAt))
            );

            const statusCell = document.createElement("td");
            const statusSelect = document.createElement("select");
            statusSelect.className = "request-status-select";
            statusSelect.setAttribute("aria-label", `Update request ${requestId || "without an ID"} status`);
            statusSelect.disabled = !requestId;

            requestStatuses.forEach((status) => {
                const option = document.createElement("option");
                option.value = status;
                option.textContent = status;
                statusSelect.append(option);
            });

            if (requestStatuses.includes(request.status)) {
                statusSelect.value = request.status;
            } else {
                const unknownStatus = document.createElement("option");
                unknownStatus.value = "";
                unknownStatus.textContent = `Unrecognized: ${request.status || "No status"}`;
                unknownStatus.selected = true;
                statusSelect.prepend(unknownStatus);
            }

            statusSelect.dataset.requestId = requestId;
            statusCell.append(statusSelect);
            row.append(statusCell);
            elements.requestTableBody.append(row);
        });
    }

    function renderDashboard() {
        const donorData = loadRecords(donorStorageKey, "Donor registrations");
        const requestData = loadRecords(requestStorageKey, "Blood requests");
        const uniqueDonors = donorData.records ? uniqueRecords(donorData.records, "id") : null;
        const uniqueRequests = requestData.records ? uniqueRecords(requestData.records, "requestId") : null;

        elements.totalDonors.textContent = uniqueDonors
            ? String(sampleDonors.length + uniqueDonors.length)
            : "—";
        elements.pendingRegistrations.textContent = uniqueDonors
            ? String(uniqueDonors.filter((record) => getDonorStatus(record) === "Pending").length)
            : "—";
        elements.approvedDonors.textContent = uniqueDonors
            ? String(uniqueDonors.filter((record) => getDonorStatus(record) === "Approved").length)
            : "—";
        elements.totalRequests.textContent = uniqueRequests ? String(uniqueRequests.length) : "—";

        renderDonors(donorData.records || [], donorData.error);
        renderRequests(requestData.records || [], requestData.error);

        const errors = [
            donorData.error,
            requestData.error,
            hasSampleDirectory ? "" : "Fictional sample donor data could not be loaded."
        ].filter(Boolean);
        setAdminMessage(errors.join(" "), errors.length ? "error" : "");
    }

    function updateDonorStatus(id, nextStatus) {
        try {
            const records = loadRecords(donorStorageKey, "Donor registrations");
            if (records.error) {
                throw new Error(records.error);
            }

            const donor = records.records.find((record) => record.id === id);
            if (!donor) {
                throw new Error("The donor registration no longer exists.");
            }

            const currentStatus = getDonorStatus(donor);
            if (nextStatus === "Approved" && currentStatus !== "Pending") {
                renderDashboard();
                setAdminMessage("Only pending registrations can be approved.", "error");
                return;
            }
            if (nextStatus === "Deactivated" && currentStatus === "Deactivated") {
                renderDashboard();
                return;
            }

            const updatedRecords = records.records.map((record) =>
                record.id === id ? { ...record, status: nextStatus } : record
            );
            window.localStorage.setItem(donorStorageKey, JSON.stringify(updatedRecords));
            renderDashboard();
            setAdminMessage(
                nextStatus === "Approved"
                    ? "Donor registration approved. It can now appear in public search."
                    : "Donor registration deactivated and removed from public search.",
                "success"
            );
        } catch (error) {
            console.error("Donor registration status could not be updated.", error);
            renderDashboard();
            setAdminMessage("Could not update the donor registration. The stored record was not changed.", "error");
        }
    }

    function updateRequestStatus(id, nextStatus) {
        if (!requestStatuses.includes(nextStatus)) {
            renderDashboard();
            setAdminMessage("Choose a valid demonstration request status.", "error");
            return;
        }

        try {
            const requests = loadRecords(requestStorageKey, "Blood requests");
            if (requests.error) {
                throw new Error(requests.error);
            }

            const requestExists = requests.records.some((request) => request.requestId === id);
            if (!requestExists) {
                throw new Error("The blood request no longer exists.");
            }

            const updatedRequests = requests.records.map((request) =>
                request.requestId === id ? { ...request, status: nextStatus } : request
            );
            window.localStorage.setItem(requestStorageKey, JSON.stringify(updatedRequests));
            renderDashboard();
            setAdminMessage(`Request status updated to ${nextStatus}. No notification was sent.`, "success");
        } catch (error) {
            console.error("Blood request status could not be updated.", error);
            renderDashboard();
            setAdminMessage("Could not update the blood request. The stored record was not changed.", "error");
        }
    }

    elements.donorSearch.addEventListener("input", renderDashboard);
    elements.donorBloodGroup.addEventListener("change", renderDashboard);
    elements.donorStatus.addEventListener("change", renderDashboard);
    elements.requestSearch.addEventListener("input", renderDashboard);
    elements.requestBloodGroup.addEventListener("change", renderDashboard);
    elements.requestStatus.addEventListener("change", renderDashboard);

    elements.donorTableBody.addEventListener("click", (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }
        const button = event.target.closest("button[data-action]");
        if (!button || !elements.donorTableBody.contains(button)) {
            return;
        }

        const { action, recordId } = button.dataset;
        if (action === "deactivate") {
            const confirmed = window.confirm("Deactivate this donor? They will no longer appear in public search.");
            if (!confirmed) {
                return;
            }
            updateDonorStatus(recordId, "Deactivated");
        } else if (action === "approve") {
            updateDonorStatus(recordId, "Approved");
        }
    });

    elements.requestTableBody.addEventListener("change", (event) => {
        if (!(event.target instanceof HTMLSelectElement) || !event.target.matches("select[data-request-id]")) {
            return;
        }
        updateRequestStatus(event.target.dataset.requestId, event.target.value);
    });

    window.addEventListener("storage", (event) => {
        if (event.key === donorStorageKey || event.key === requestStorageKey || event.key === null) {
            renderDashboard();
        }
    });

    renderDashboard();
})();