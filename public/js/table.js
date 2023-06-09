const columns = document.getElementById("columns");

const saveButton = document.getElementById("save");
const changeButton = document.getElementById("change");
const deleteButton = document.getElementById("delete");

let imageFromClicked = "";

function isNumberKey(evt) {
    var charCode = (evt.which) ? evt.which : evt.keyCode
    if (charCode > 31 && (charCode < 48 || charCode > 57))
        return false;
    return true;
}

const clickedElement = (e, columns) => {
    const fields = columns.split(',');
    // console.log(fields);
    // const data = [];//['id','img','title','desc']
    // console.log(e.children);


    for (let i = 0; i < fields.length; i++) {
        if (fields[i] === "Image") {
            // console.log(e.children[i].firstChild.src);'
            imageFromClicked = e.children[i].firstChild.src
            // document.getElementById(fields[i]).files[0] = e.children[i].firstChild.src;
        } else {
            // console.log(e.children[i].innerText);

            const input = document.getElementById(fields[i]);

            input.value = e.children[i].innerText;
        }
    }
}

saveButton.addEventListener("click", async (e) => {
    const tableName = e.target.name.split("/")[0];
    const primaryKey = e.target.name.split("/")[1];
    const columnsName = columns.innerText.split("\n");
    columnsName.splice(columnsName.indexOf(primaryKey), 1);

    const data = [];

    for (let i = 0; i < columnsName.length; i++) {
        if (columnsName[i] === "Image") {

            const file = document.getElementById(columnsName[i]).files[0];

            const getBase64 = (file) =>
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                });

            let base64;

            if (file) {
                base64 = await getBase64(file);
            } else {
                base64 = imageFromClicked;
            }


            data.push(base64.substring(22));
        } else {
            data.push(document.getElementById(columnsName[i]).value);
        }
    }

    axios.post(`/tableAdd/${tableName}`, {
        data,
        columnsName
    }).then((res) => {
        if (res.status === 200) {
            alert("Успешно");
            window.location.reload();
        }
    }).catch((err) => {
        if(err.response.status === 304){
            alert("Заполните все поля корректно")
        }
    })
})

changeButton.addEventListener("click", async (e) => {
    const tableName = e.target.name.split("/")[0];
    const primaryKey = e.target.name.split("/")[1];
    const columnsName = columns.innerText.split("\n");
    const id = document.getElementById(primaryKey).value;

    columnsName.splice(columnsName.indexOf(primaryKey), 1);

    const data = [];

    for (let i = 0; i < columnsName.length; i++) {
        if (columnsName[i] === "Image") {
            const file = document.getElementById(columnsName[i]).files[0];

            console.log(file);
            const getBase64 = (file) =>
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                });

            let base64;

            if (file) {
                base64 = await getBase64(file);
            } else {
                base64 = imageFromClicked;
            }

            data.push(base64.substring(22));
        } else {
            const value = document.getElementById(columnsName[i]).value;
            if (value.length > 0) {
                data.push(value);
            } else {
                return alert("Заполните все поля");
            }
        }
    }

    axios.post(`/tableChangeData/${tableName}`, {
        columnsName,
        data,
        field: primaryKey,
        id
    }).then((res) => {
        if (res.status === 200) {
            alert("Успешно");
            window.location.reload();
        }
    }).catch((err) => {
        if (err.response.status === 404) {
            alert("Данной записи в таблице не существует");
            window.location.reload();
        }
    })
})

deleteButton.addEventListener("click", (e) => {
    const tableName = e.target.name.split("/")[0];
    const primaryKey = e.target.name.split("/")[1];
    const id = document.getElementById(primaryKey).value;

    if (id.length > 0) {
        axios.post(`/tableDeleteData/${tableName}`, {
            field: primaryKey,
            id
        }).then(res => {
            if (res.status === 200) {
                alert("Успешно");
                window.location.reload();
            }
        }).catch(err => {
            if (err.response.status === 304) {
                alert("Данная запись используется в другой таблице, удаление невозможно")
            }
        })
    } else {
        alert("Выберите поле для удаления")
    }
})
