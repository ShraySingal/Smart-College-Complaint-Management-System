const getPriority = (category) => {
    const cat = category.toLowerCase();
    if (cat === "electricity" || cat === "water") {
        return "High";
    }
    if (cat === "internet") {
        return "Medium";
    }
    return "Low";
};

module.exports = { getPriority };
