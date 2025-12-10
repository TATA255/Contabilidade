function login(){
    document.getElementById("login").classList.remove("sumir");
    document.getElementById("cadastrar").classList.add("sumir");
}

function cadastrar(){
    document.getElementById("login").classList.add("sumir");
    document.getElementById("cadastrar").classList.remove("sumir");
}