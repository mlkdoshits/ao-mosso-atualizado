async function dispararNotificacaoAgradecimento() {
    const message = {
        notification: {
            title: "Valeu pelo ao mosso, grande Arthur Navey! 🙏",
            body: "Acabei de ver que vc liberou o ao mosso dus guri. 🍽️"
        },
        topic: "aomosso_geral"
    };

    try {
        await admin.messaging().send(message);
        console.log("Notificação de agradecimento enviada via Firebase com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar notificação push:", error);
    }
}
