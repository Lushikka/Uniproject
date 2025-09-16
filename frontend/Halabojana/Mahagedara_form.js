// Menu_form.js

document.getElementById("menuForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const itemData = {
        name: document.getElementById("itemName").value,
        desc: document.getElementById("itemDesc").value,
        price: document.getElementById("itemPrice").value,
        type: document.getElementById("itemType").value,
        available: document.getElementById("itemAvailable").checked
    };

    const action = document.getElementById("submitBtn").textContent;

    if(action === "Add") {
        alert("New Item Added:\n" + JSON.stringify(itemData, null, 2));
        //  Later: send POST to backend
    } else if(action === "Update") {
        alert("Item Updated:\n" + JSON.stringify(itemData, null, 2));
        //  Later: send PUT/PATCH to backend
    }

    // After save/update → go back to dashboard
    window.location.href = "MahagedaraDashboard.html";
});

function onCancel() {
    window.location.href = "MahagedaraDashboard.html";
}
