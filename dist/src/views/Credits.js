import {
  Container,
  Row,
} from "reactstrap";

const Credits = () => {
  return (
    <Container className="mt-4" fluid>
      <Row>
        <div className="col">
          <h1>Créditos</h1>
          
          <p><strong>Concepção e implementação:</strong><br />
            <a href="https://sites.google.com/site/nabormendonca/" target="_blank" rel="noreferrer">
              Nabor Mendonça
            </a> (UNIFOR)
          </p>

          <p><strong>Consultoria de conteúdo:</strong><br />Andréia Formico (UNIFOR)</p>

          <p><strong>Consultoria técnica:</strong><br />Lucas Mendonça (Instituto Eldorado)</p>

          <p><strong>Consultoria sobre a fonte de dados da CAPES:</strong><br />André Luiz F. Batista (IFTM-MG)</p>

          <p><strong>Criação da fonte de dados da PUC-RS:</strong><br />Olimar Borges (PUC-RS)</p>

          <p><strong>Colaboração no desenvolvimento:</strong><br />Eduardo de Morais Tajra (UNIFOR)</p>

          <p><strong>Logo:</strong><br />Variação sobre os logos do Qualis e da Plataforma Lattes</p>

        </div>
      </Row>
    </Container>
  );
}

export default Credits;
