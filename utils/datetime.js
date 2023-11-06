
module.exports = {addZeroToLeft: addZeroToLeft, addZeroToLeftToDateString: addZeroToLeftToDateString, dateObjToHyphenFormat: dateObjToHyphenFormat, dateObjToHyphenFormat2: dateObjToHyphenFormat2, getDateRelativeTerm: getDateRelativeTerm}

function addZeroToLeft(string) {
    if (string < 10) {
        return `0${string}`
    } else return `${string}`
}

function addZeroToLeftToDateString(string) {
    let returnString = ""
    for (let i of string.split("-")) {
        returnString += `${addZeroToLeft(i)}-`
    }
    return returnString.slice(0, returnString.length - 1);
}

function dateObjToHyphenFormat(dateObj) {
    return `${dateObj.getFullYear()}-${addZeroToLeft(dateObj.getMonth() + 1)}-${addZeroToLeft(dateObj.getDate())}`
}

function dateObjToHyphenFormat2(dateObj) {
    return `${addZeroToLeft(dateObj.getDate())}-${addZeroToLeft(dateObj.getMonth() + 1)}-${dateObj.getFullYear()}`
}

function getDateRelativeTerm(dateObj) {

    dateObj = new Date(`${dateObj.getFullYear()}-${dateObj.getMonth() + 1 < 10 ? `0${dateObj.getMonth() + 1}` : dateObj.getMonth() + 1}-${dateObj.getDate() < 10 ? `0${dateObj.getDate()}` : dateObj.getDate()}T00:00:00.000+00:00`)

    const checkDateEquality = (date1, date2) => {
        return (date1.getTime() === date2.getTime())
    }

    let newDateObj = new Date()
    const todaysDate = new Date(`${newDateObj.getFullYear()}-${newDateObj.getMonth() + 1 < 10 ? `0${newDateObj.getMonth() + 1}` : newDateObj.getMonth() + 1}-${newDateObj.getDate() < 10 ? `0${newDateObj.getDate()}` : newDateObj.getDate()}T00:00:00.000+00:00`)
    if (checkDateEquality(dateObj, todaysDate)) return "Today"
    
    newDateObj = new Date(new Date().getTime() - 86400000)
    const yesterdaysDate = new Date(`${newDateObj.getFullYear()}-${newDateObj.getMonth() + 1 < 10 ? `0${newDateObj.getMonth() + 1}` : newDateObj.getMonth() + 1}-${newDateObj.getDate() < 10 ? `0${newDateObj.getDate()}` : newDateObj.getDate()}T00:00:00.000+00:00`)
    if (checkDateEquality(dateObj, yesterdaysDate)) return "Yesterday"
    
    newDateObj = new Date(new Date().getTime() + 86400000)
    const tomorrowsDate = new Date(`${newDateObj.getFullYear()}-${newDateObj.getMonth() + 1 < 10 ? `0${newDateObj.getMonth() + 1}` : newDateObj.getMonth() + 1}-${newDateObj.getDate() < 10 ? `0${newDateObj.getDate()}` : newDateObj.getDate()}T00:00:00.000+00:00`)
    if (checkDateEquality(dateObj, tomorrowsDate)) return "Tomorrow"
    
    return null
}