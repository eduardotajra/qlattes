import { Container, Row } from "reactstrap";

const Comments = () => {
  return (
    <Container className="mt-4" fluid>
      <Row>
        <div className="col">
          <h1>Comentários e sugestões</h1>
          <p style={{ marginBottom: "1rem" }}>
            Este espaço destina-se ao envio de sugestões, observações ou apontamentos relacionados ao uso e funcionamento deste produto. 
            As contribuições aqui registradas são de grande relevância para o aprimoramento contínuo da ferramenta.
          </p>
          <div style={{ position: "relative", paddingBottom: "65%", height: 0, overflow: "hidden" }}>
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLScWkosurzk1ukkTV28Yv9dGzIcw4jlmY6zWfCf9CjbEHU3Fig/viewform?embedded=true"
              title="Formulário de comentários e sugestões"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: "8px",
              }}
            >
              Carregando…
            </iframe>
          </div>
        </div>
      </Row>
    </Container>
  );
};

export default Comments;
