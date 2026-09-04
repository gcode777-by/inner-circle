// ========================================
// CONTACT FORM
// ========================================

const contactForm = document.querySelector(".contact-form");

if (contactForm) {

    contactForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const nameInput =
            contactForm.querySelector('input[type="text"]');

        const name =
            nameInput ? nameInput.value : "Member";

        alert(
            "Thank you, " +
            name +
            "! Your message has been received."
        );

        contactForm.reset();

    });

}


// ========================================
// LOGIN FORM
// ========================================

const loginForm =
    document.querySelector(".login-form");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                loginForm.querySelector(
                    'input[type="email"]'
                ).value;

            const password =
                loginForm.querySelector(
                    'input[type="password"]'
                ).value;

            try {

                const response = await fetch(
                    "/api/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email: email,
                            password: password
                        })
                    }
                );

                const data =
                    await response.json();

                if (!response.ok) {

                    alert(data.message);

                    return;
                }

                sessionStorage.setItem(
                    "innerCircleToken",
                    data.token
                );

                sessionStorage.setItem(
                    "innerCircleMember",
                    JSON.stringify(data.member)
                );

                alert(
                    "Login successful! Welcome back."
                );

                window.location.href =
                    "pages/dashboard.html";

            } catch (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );

                alert(
                    "Unable to connect to the Inner Circle server."
                );

            }

        }
    );

}


// ========================================
// REGISTER FORM
// ========================================

const registerForm =
    document.querySelector(".register-form");

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const fullName =
                registerForm.querySelector(
                    'input[placeholder="Full Name"]'
                ).value;

            const email =
                registerForm.querySelector(
                    'input[placeholder="Email Address"]'
                ).value;

            const password =
                registerForm.querySelector(
                    'input[placeholder="Create Password"]'
                ).value;

            const confirmPassword =
                registerForm.querySelector(
                    'input[placeholder="Confirm Password"]'
                ).value;

            const membershipTier =
                registerForm.querySelector(
                    "#membershipTier"
                ).value;


            if (password !== confirmPassword) {

                alert(
                    "The passwords do not match."
                );

                return;
            }


            if (!membershipTier) {

                alert(
                    "Please select a membership."
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                fullName:
                                    fullName,

                                email:
                                    email,

                                password:
                                    password,

                                membershipTier:
                                    membershipTier
                            })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    alert(data.message);

                    return;
                }


                alert(
                    "Registration successful! Welcome to Inner Circle."
                );

                registerForm.reset();

                window.location.href =
                    "login.html";

            } catch (error) {

                console.error(
                    "REGISTER ERROR:",
                    error
                );

                alert(
                    "Unable to connect to the Inner Circle server."
                );

            }

        }
    );

}


// ========================================
// MEMBER DASHBOARD
// ========================================

if (
    window.location.pathname.includes(
        "dashboard.html"
    )
) {

    const token =
        sessionStorage.getItem(
            "innerCircleToken"
        );


    if (!token) {

        window.location.href =
            "../index.html#login";

    } else {

        loadMemberDashboard(token);

    }

}


// ========================================
// LOAD MEMBER DASHBOARD
// ========================================

async function loadMemberDashboard(token) {

    try {

        const response =
            await fetch(
                "/api/me",
                {
                    headers: {
                        "Authorization": token
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                "Session expired or invalid."
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load member."
            );

        }


        const member =
            data.member;


        // Save the freshest member information

        sessionStorage.setItem(
            "innerCircleMember",
            JSON.stringify(member)
        );


        // ------------------------------------
        // BASIC MEMBER INFORMATION
        // ------------------------------------

        setText(
            "memberName",
            member.fullName
        );

        setText(
            "memberEmail",
            member.email
        );


        // ------------------------------------
        // WELCOME
        // ------------------------------------

        setText(
            "welcomeMemberName",
            member.fullName ||
            "Member"
        );


        // ------------------------------------
        // MEMBERSHIP
        // ------------------------------------

        const tier =
            member.membershipTier ||
            "Loyalty Seal";


        setText(
            "memberMembership",
            tier
        );

        setText(
            "dashboardMembershipTier",
            tier
        );

        setText(
            "profileTier",
            tier
        );

        setText(
            "overviewTier",
            tier
        );

        setText(
            "overviewMembership",
            tier
        );


        // ------------------------------------
        // PROFILE
        // ------------------------------------

        setText(
            "profileName",
            member.fullName ||
            "Member"
        );

        setText(
            "profileEmail",
            member.email ||
            "—"
        );

        setText(
            "profileId",
            member.id ||
            "—"
        );

        setText(
            "profileMembership",
            tier
        );

        setText(
            "profileDate",
            member.createdAt ||
            "—"
        );


        const profileInitial =
            document.getElementById(
                "profileInitial"
            );


        if (profileInitial) {

            profileInitial.textContent =
                (member.fullName || "M")
                    .charAt(0)
                    .toUpperCase();

        }


        // ------------------------------------
        // MEMBERSHIP DESCRIPTION
        // ------------------------------------

        const descriptions = {

            "Loyalty Seal":
                "Core Inner Circle membership with exclusive content and member recognition.",

            "Trust Bond":
                "Expanded membership with additional exclusive content and eligible member experiences.",

            "Eternal Circle":
                "Premium membership with expanded benefits and eligible exclusive experiences."

        };


        setText(
            "overviewDescription",
            descriptions[tier] ||
            descriptions["Loyalty Seal"]
        );


        // ------------------------------------
        // BENEFITS
        // ------------------------------------

        loadMembershipBenefits(tier);


    } catch (error) {

        console.error(
            "Unable to load member information:",
            error
        );


        sessionStorage.removeItem(
            "innerCircleToken"
        );

        sessionStorage.removeItem(
            "innerCircleMember"
        );


        window.location.href =
            "../index.html#login";

    }

}


// ========================================
// HELPER — SET TEXT
// ========================================

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value ?? "";

    }

}


// ========================================
// MEMBERSHIP BENEFITS
// ========================================

function loadMembershipBenefits(tier) {

    const dashboardBenefits =
        document.getElementById(
            "dashboardBenefits"
        );


    const dynamicBenefits =
        document.getElementById(
            "dynamicBenefits"
        );


    const membershipDescription =
        document.getElementById(
            "membershipDescription"
        );


    const benefits = {

        "Loyalty Seal": [
            "Exclusive member content",
            "Priority recognition",
            "Member communications",
            "Selected community events"
        ],

        "Trust Bond": [
            "Everything included with Loyalty Seal",
            "Additional exclusive content",
            "Enhanced member recognition",
            "Priority consideration for selected events",
            "Eligible meet-and-greet opportunities"
        ],

        "Eternal Circle": [
            "Everything included with Trust Bond",
            "Premium exclusive content",
            "Priority consideration for selected experiences",
            "Eligible private event and meet-and-greet opportunities",
            "Exclusive member rewards"
        ]

    };


    const selected =
        benefits[tier] ||
        benefits["Loyalty Seal"];


    // Simple benefits list

    if (dashboardBenefits) {

        dashboardBenefits.innerHTML =
            selected
                .map(
                    benefit =>
                        `<li>✓ ${benefit}</li>`
                )
                .join("");

    }


    // Detailed benefits cards

    if (dynamicBenefits) {

        const detailedBenefits = {

            "Loyalty Seal": [
                [
                    "✦",
                    "Priority Recognition",
                    "Receive recognition associated with your Inner Circle membership."
                ],
                [
                    "◇",
                    "Members-Only Updates",
                    "Access selected updates and announcements."
                ],
                [
                    "★",
                    "Meet & Greet Opportunities",
                    "View eligible opportunities for designated experiences."
                ],
                [
                    "∞",
                    "Member Rewards",
                    "Explore rewards associated with your membership."
                ]
            ],

            "Trust Bond": [
                [
                    "✦",
                    "Everything in Loyalty Seal",
                    "Continue receiving the benefits of the foundational membership."
                ],
                [
                    "★",
                    "Meet & Greet Opportunities",
                    "View eligible opportunities for designated experiences."
                ],
                [
                    "◇",
                    "Private Member Updates",
                    "Access selected members-only communications and content."
                ],
                [
                    "∞",
                    "Exclusive Events",
                    "Explore events and experiences available to eligible members."
                ]
            ],

            "Eternal Circle": [
                [
                    "✦",
                    "Everything in Trust Bond",
                    "Continue receiving the benefits of the previous membership level."
                ],
                [
                    "★",
                    "Premium Meet & Greet Opportunities",
                    "View eligible premium experiences when scheduled."
                ],
                [
                    "◇",
                    "Exclusive Events",
                    "Explore selected premium events and experiences."
                ],
                [
                    "∞",
                    "Premium Member Rewards",
                    "Explore additional rewards and recognition associated with your membership."
                ]
            ]

        };


        const detailed =
            detailedBenefits[tier] ||
            detailedBenefits["Loyalty Seal"];


        dynamicBenefits.innerHTML =
            detailed.map(item => {

                return `
                    <div class="dashboard-benefit">

                        <span>${item[0]}</span>

                        <h3>${item[1]}</h3>

                        <p>${item[2]}</p>

                    </div>
                `;

            }).join("");

    }


    if (membershipDescription) {

        const descriptions = {

            "Loyalty Seal":
                "Your foundational Inner Circle membership experience.",

            "Trust Bond":
                "An expanded Inner Circle experience with additional member benefits.",

            "Eternal Circle":
                "Our highest membership tier with expanded benefits and eligible premium experiences."

        };


        membershipDescription.textContent =
            descriptions[tier] ||
            descriptions["Loyalty Seal"];

    }

}


// ========================================
// MEMBER LOGOUT
// ========================================

function logoutMember() {

    sessionStorage.removeItem(
        "innerCircleMember"
    );

    sessionStorage.removeItem(
        "innerCircleToken"
    );

    window.location.href =
        "../index.html#login";

}


// ========================================
// EVENT INTEREST
// ========================================

const interestButton =
    document.getElementById(
        "interestButton"
    );


if (interestButton) {

    interestButton.addEventListener(
        "click",
        async function () {

            const token =
                sessionStorage.getItem(
                    "innerCircleToken"
                );

            const message =
                document.getElementById(
                    "interestMessage"
                );


            if (!token) {

                if (message) {

                    message.textContent =
                        "Please log in to express interest.";

                }

                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/event-interest",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    token
                            },

                            body: JSON.stringify({
                                event:
                                    "Private Member Meet & Greet"
                            })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    if (message) {
                        message.textContent =
                            data.message;
                    }

                    return;
                }


                if (message) {

                    message.textContent =
                        "Your interest has been recorded.";

                }


                interestButton.textContent =
                    "Interest Submitted";

                interestButton.disabled =
                    true;


            } catch (error) {

                console.error(error);

                if (message) {

                    message.textContent =
                        "Unable to connect to the server.";

                }

            }

        }
    );

}


// ========================================
// MEMBERSHIP SELECTION
// ========================================

const membershipButtons =
    document.querySelectorAll(
        ".select-membership"
    );


membershipButtons.forEach(button => {

    button.addEventListener(
        "click",
        async function () {

            const membership =
                button.dataset.membership;
                sessionStorage.setItem(
              "selectedMembership",
                  membership
         );

        window.location.href =
            "pages/checkout.html";

        return;

            const token =
                sessionStorage.getItem(
                    "innerCircleToken"
                );


            if (!token) {

                alert(
                    "Please log in first."
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/membership",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    token
                            },

                            body: JSON.stringify({
                                membership:
                                    membership
                            })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    alert(data.message);

                    return;
                }


                const member =
                    JSON.parse(
                        sessionStorage.getItem(
                            "innerCircleMember"
                        )
                    );


                member.membershipTier =
                    data.membershipTier ||
                    membership;


                sessionStorage.setItem(
                    "innerCircleMember",
                    JSON.stringify(member)
                );


                alert(
                    "Your membership has been updated to " +
                    membership +
                    "."
                );


                loadMemberDashboard(token);


            } catch (error) {

                console.error(error);

                alert(
                    "Unable to connect to the server."
                );

            }

        }
    );

});
// ========================================
// ADMIN DASHBOARD
// ========================================
const adminToken =
    sessionStorage.getItem(
        "innerCircleAdminToken"
    );

if (
    window.location.pathname.includes("admin.html") &&
    !adminToken
) {
    window.location.href =
        "admin-login.html";
}
if (window.location.pathname.includes("admin.html")) {

    loadAdminDashboard();

}


async function loadAdminDashboard() {

    try {

        const adminToken =
    sessionStorage.getItem(
        "innerCircleAdminToken"
    );

if (!adminToken) {

    window.location.href =
        "admin-login.html";

    return;
}

const response =
    await fetch(
        "/api/admin/members",
        {
            headers: {
                "Authorization": adminToken
            }
        }
    );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Unable to load members."
            );

        }


        const members =
            data.members || [];


        // ------------------------------------
        // MEMBER COUNTS
        // ------------------------------------

        setText(
            "totalMembers",
            members.length
        );


        setText(
            "loyaltyCount",
            members.filter(
                member =>
                    member.membership_tier ===
                    "Loyalty Seal"
            ).length
        );


        setText(
            "trustCount",
            members.filter(
                member =>
                    member.membership_tier ===
                    "Trust Bond"
            ).length
        );


        setText(
            "eternalCount",
            members.filter(
                member =>
                    member.membership_tier ===
                    "Eternal Circle"
            ).length
        );


        // ------------------------------------
        // MEMBERS LIST
        // ------------------------------------

        const container =
            document.getElementById(
                "membersContainer"
            );


        if (!container) {
            return;
        }


        if (members.length === 0) {

            container.innerHTML =
                "<p>No members registered yet.</p>";

            return;
        }


        container.innerHTML =
            members.map(member => {

                return `
                    <div class="member-card admin-member">

                        <h3>
                            ${member.full_name}
                        </h3>

                        <p>
                            ${member.email}
                        </p>

                        <p>
                            Membership:
                            <strong>
                                ${member.membership_tier || "Loyalty Seal"}
                            </strong>
                        </p>

                        <small>
                            Registered:
                            ${member.created_at || "—"}
                        </small>

                    </div>
                `;

            }).join("");


    } catch (error) {

        console.error(
            "ADMIN DASHBOARD ERROR:",
            error
        );


        const container =
            document.getElementById(
                "membersContainer"
            );


        if (container) {

            container.innerHTML =
                "<p>Unable to load members.</p>";

        }

    }

}
// ========================================
// ADMIN EVENT INTERESTS
// ========================================

if (window.location.pathname.includes("admin.html")) {

    loadAdminEventInterests();

}


async function loadAdminEventInterests() {

    try {

        const adminToken =
    sessionStorage.getItem(
        "innerCircleAdminToken"
    );

if (!adminToken) {

    window.location.href =
        "admin-login.html";

    return;
}

const response =
    await fetch(
        "/api/admin/event-interests",
        {
            headers: {
                "Authorization": adminToken
            }
        }
    );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Unable to load event interests."
            );

        }


        const interests =
            data.interests || [];


        const container =
            document.getElementById(
                "interestContainer"
            );


        if (!container) {
            return;
        }


        if (interests.length === 0) {

            container.innerHTML =
                "<p>No event interests yet.</p>";

            return;
        }


        container.innerHTML =
            interests.map(interest => {

                return `
                    <div class="interest-card">

                        <h3>
                            ${interest.event_name}
                        </h3>

                        <p>
                            <strong>
                                ${interest.full_name}
                            </strong>
                        </p>

                        <p>
                            ${interest.email}
                        </p>

                        <small>
                            Submitted:
                            ${interest.created_at || "—"}
                        </small>

                    </div>
                `;

            }).join("");


    } catch (error) {

        console.error(
            "ADMIN EVENT INTEREST ERROR:",
            error
        );


        const container =
            document.getElementById(
                "interestContainer"
            );


        if (container) {

            container.innerHTML =
                "<p>Unable to load event interests.</p>";

        }

    }

}
// ========================================
// ADMIN LOGIN
// ========================================

const adminLoginForm =
    document.getElementById("adminLoginForm");


if (adminLoginForm) {

    adminLoginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const username =
                document.getElementById(
                    "adminUsername"
                ).value;

            const password =
                document.getElementById(
                    "adminPassword"
                ).value;

            const message =
                document.getElementById(
                    "adminLoginMessage"
                );


            try {

                const response =
                    await fetch(
                        "/api/admin/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                username:
                                    username,

                                password:
                                    password
                            })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    message.textContent =
                        data.message;

                    return;
                }


                sessionStorage.setItem(
                    "innerCircleAdminToken",
                    data.token
                );


                message.textContent =
                    "Login successful.";


                setTimeout(() => {

                    window.location.href =
                        "admin.html";

                }, 500);


            } catch (error) {

                console.error(
                    "ADMIN LOGIN ERROR:",
                    error
                );

                message.textContent =
                    "Unable to connect to the server.";

            }

        }
    );

}
// ========================================
// ADMIN LOGOUT
// ========================================

function logoutAdmin() {

    sessionStorage.removeItem(
        "innerCircleAdminToken"
    );

    window.location.href =
        "admin-login.html";

}
const checkoutMembership =
    document.getElementById(
        "checkoutMembership"
    );

if (checkoutMembership) {

    const selectedMembership =
        sessionStorage.getItem(
            "selectedMembership"
        );

    if (selectedMembership) {

        checkoutMembership.textContent =
            selectedMembership;

    }

}
// ========================================
// PAYMENT REQUEST
// ========================================

const paymentButton =
    document.getElementById("paymentButton");

if (paymentButton) {

    paymentButton.addEventListener(
        "click",
        async function () {

            const token =
                sessionStorage.getItem(
                    "innerCircleToken"
                );

            const member =
                JSON.parse(
                    sessionStorage.getItem(
                        "innerCircleMember"
                    )
                );

            const message =
                document.getElementById(
                    "paymentMessage"
                );

            const membership =
                member.membershipTier ||
                member.membership ||
                "Loyalty Seal";

            if (!token) {

                message.textContent =
                    "Please log in first.";

                return;
            }

            try {

                const response =
                    await fetch(
                        "/api/payment-request",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    token
                            },

                            body: JSON.stringify({
                                membership:
                                    membership
                            })
                        }
                    );

                const data =
                    await response.json();

                message.textContent =
                    data.message;

                if (response.ok) {

                    paymentButton.disabled =
                        true;

                    paymentButton.textContent =
                        "Confirmation Pending";
                }

            } catch (error) {

                console.error(error);

                message.textContent =
                    "Unable to contact the server.";
            }
        }
    );
}
// ========================================
// ADMIN PAYMENT REQUESTS
// ========================================

if (
    window.location.pathname.includes("admin.html")
) {

    loadAdminPaymentRequests();

}


async function loadAdminPaymentRequests() {

    const adminToken =
        sessionStorage.getItem(
            "innerCircleAdminToken"
        );

    if (!adminToken) {
        return;
    }

    const container =
        document.getElementById(
            "paymentRequestsContainer"
        );

    if (!container) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/admin/payment-requests",
                {
                    headers: {
                        "Authorization":
                            adminToken
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message);
        }

        const requests =
            data.requests || [];

        if (requests.length === 0) {

            container.innerHTML =
                "<p>No payment requests yet.</p>";

            return;
        }

        container.innerHTML =
            requests.map(request => {

                const button =
                    request.status === "Pending"
                        ? `
                            <button
                                onclick="confirmPayment(${request.id})"
                            >
                                Confirm Payment
                            </button>
                          `
                        : `
                            <strong>
                                Payment Confirmed
                            </strong>
                          `;

                return `
                    <div class="payment-request-card">

                        <h3>
                            ${request.full_name}
                        </h3>

                        <p>
                            ${request.email}
                        </p>

                        <p>
                            Membership:
                            <strong>
                                ${request.membership}
                            </strong>
                        </p>

                        <p>
                            Status:
                            ${request.status}
                        </p>

                        <small>
                            Requested:
                            ${request.created_at}
                        </small>

                        <div>
                            ${button}
                        </div>

                    </div>
                `;

            }).join("");

    } catch (error) {

        console.error(error);

        container.innerHTML =
            "<p>Unable to load payment requests.</p>";
    }
}
async function confirmPayment(requestId) {

    const adminToken =
        sessionStorage.getItem(
            "innerCircleAdminToken"
        );

    if (!adminToken) {
        return;
    }

    const confirmed =
        confirm(
            "Only confirm this payment after verifying that the payment was actually received. Continue?"
        );

    if (!confirmed) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/admin/confirm-payment",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            adminToken
                    },

                    body: JSON.stringify({
                        requestId:
                            requestId
                    })
                }
            );

        const data =
            await response.json();

        alert(data.message);

        if (response.ok) {
            loadAdminPaymentRequests();
        }

    } catch (error) {

        console.error(error);

        alert(
            "Unable to confirm payment."
        );
    }
}
// ========================================
// MEMBER PAYMENT STATUS
// ========================================

if (
    window.location.pathname.includes("dashboard.html")
) {

    loadMemberPaymentStatus();

}


async function loadMemberPaymentStatus() {

    const token =
        sessionStorage.getItem(
            "innerCircleToken"
        );

    if (!token) {
        return;
    }

    const statusElement =
        document.getElementById(
            "memberPaymentStatus"
        );

    const messageElement =
        document.getElementById(
            "memberPaymentMessage"
        );

    if (!statusElement) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/payment-status",
                {
                    headers: {
                        "Authorization": token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message);
        }

        if (!data.payment) {

            statusElement.textContent =
                "No Payment Request";

            messageElement.textContent =
                "Submit a payment confirmation request when ready.";

            return;
        }

        if (
            data.payment.status ===
            "Pending"
        ) {

            statusElement.textContent =
                "Payment Pending";

            messageElement.textContent =
                "Your payment confirmation is awaiting admin verification.";

        } else if (
            data.payment.status ===
            "Confirmed"
        ) {

            statusElement.textContent =
                "Payment Confirmed";

            messageElement.textContent =
                "Your membership payment has been confirmed.";

        }

    } catch (error) {

        console.error(
            "PAYMENT STATUS ERROR:",
            error
        );

        statusElement.textContent =
            "Unable to check status.";

        messageElement.textContent =
            "Please refresh and try again.";
    }
}
// ========================================
// PROTECT ADMIN DASHBOARD
// ========================================

if (
    window.location.pathname.includes("admin.html")
) {

    const adminToken =
        sessionStorage.getItem(
            "innerCircleAdminToken"
        );

    if (!adminToken) {

        window.location.href =
            "admin-login.html";

    }

}