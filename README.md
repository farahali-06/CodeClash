# RoktoLink: Blood Donor Finder

RoktoLink is a community-focused hackathon prototype that demonstrates how people could explore potential blood donors by blood group and general location.

> **Prototype notice:** All donor examples are fictional. Registrations and requests are demonstration records saved only in the current browser. RoktoLink does not verify medical eligibility, confirm current donor availability, or contact hospitals or donors.

## Project Overview

RoktoLink brings a sample donor directory, donor registration form, blood request form, and demonstration admin dashboard together in a responsive website. It is built with standard browser technologies and does not require a backend or external API.

## Problem Statement

When someone needs blood, finding potential donors with a relevant blood group in a nearby area can be difficult. Information may be spread across different community channels, making it hard to explore options in one place.

## Proposed Solution

RoktoLink demonstrates a simple interface for browsing fictional donor examples by blood group and location. Visitors can also create sample donor registrations and blood requests. A demo dashboard lets a reviewer manage those records locally.

The prototype is for demonstration and awareness only. It is not a medical service or a replacement for a hospital or licensed blood bank.

## Main Features

- **Homepage:** Introduces RoktoLink, explains the demonstration workflow, and presents safety information.
- **Donor Registration:** Saves fictional test registrations with a generated ID and an initial pending-review status.
- **Donor Search:** Filters fictional sample profiles and approved demo registrations by blood group and city or locality. Sample profiles remain available independently of registrations.
- **Blood Request Submission:** Saves a sample request with a generated request ID, a required-by date, and an initial `Pending Demo Review` status.
- **Admin Dashboard:** Shows counts and saved records, with search and filtering controls for registrations and requests.
- **Donor Approval and Deactivation:** Admins can approve pending registrations for inclusion in public search or deactivate registrations to exclude them. These are demo statuses, not verification.

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- Browser LocalStorage

No JavaScript framework, cloud database, or external API is required.

## Project Folder Structure

```text
CodeClash/
├── index.html    # Main website and visitor forms
├── admin.html    # Demonstration admin dashboard
├── style.css     # Responsive styles for the site and dashboard
├── script.js     # Search, forms, LocalStorage, and dashboard behavior
├── data.js       # Fictional sample donor profiles
└── README.md     # Project documentation
```

## How to Run the Project

1. Open the project folder in Visual Studio Code.
2. Install the **Live Server** extension if it is not already available.
3. Open `index.html`, then select **Go Live** or use **Open with Live Server**.
4. To view the demonstration dashboard, open `admin.html` through the same Live Server origin (for example, append `/admin.html` to the local site URL).

Use the same local server origin for both pages so they can access the same browser LocalStorage. No package installation or build step is needed.

## How the Project Works

1. Visitors explore the homepage and read the prototype safety notice.
2. A visitor can enter fictional information in the donor registration form. The browser saves it as a pending demo registration.
3. A reviewer opens the admin dashboard and can approve or deactivate that registration. Approval only changes its demo status.
4. The public donor search combines the fictional sample directory with approved registrations. Pending and deactivated registrations are excluded.
5. A visitor can submit a sample blood request. It is saved locally with the status `Pending Demo Review`.
6. In the admin dashboard, a reviewer can change a request's demonstration status to `Reviewed` or `Closed`.

These steps do not send notifications or communicate with a donor, hospital, or blood bank.

## Data Storage

The prototype stores data in the browser's LocalStorage under two keys:

- `roktolinkDonorRegistrations` - donor registration details, generated ID, registration date, and demo status.
- `roktolinkBloodRequests` - request details, generated request ID, required-by date, submission time, and demo status.

Sample donor profiles are defined in `data.js`; they are not saved as registrations. LocalStorage is specific to the browser and site origin. It is not a shared database, backup, or secure storage system. Clearing browser site data can remove these records.

## Safety and Privacy

- The included donor directory uses fictional sample profiles.
- Use fictional test information only; do not enter sensitive or real personal information.
- Donor preferences are stated preferences only. Listings do not establish medical eligibility, confirmed matches, or current availability.
- No phone numbers or residential addresses are requested by the forms.
- Blood requests are saved as examples only. No hospital or donor is contacted and no blood arrangement is made.
- For an actual blood requirement, contact a hospital or licensed blood bank directly.

## Limitations

- This is a hackathon demonstration prototype, not a production-ready medical service.
- There is no backend, cloud database, real authentication, or secure admin access.
- Records exist only in the current browser and site origin.
- Donor information and availability are not verified or updated in real time.
- Request statuses are administrative demonstration labels only; they do not represent real-world action.
- There are no notifications, messaging, or integrations with hospitals or blood banks.

## AI Assistance and Third-Party Resources

AI assistance was used during development and review, including help with implementation, testing, and this documentation. The project files do not identify any external templates, third-party UI components, frameworks, paid APIs, or external resource dependencies.
