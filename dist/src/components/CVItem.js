import {
  Col,
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupText
} from "reactstrap";
import { useState } from "react";

import {
  removerCVfromDB,
  removeCVfromGroup,
  exportCV,
  exportCVToCsv,
  getGroups
} from "../utils";

const CVItem = ({
  authorName,
  CVLink,
  group,
  groupName,
  updateGroups,
  updateAuthors,
  allQualisScores
}) => {
  const handleRemoveButton = async (e) => {
    let result;
    if (group) { // deletar de grupo
      result = window.confirm(
        `Confirma a remoção de ${authorName} do grupo ${groupName}?`
      );
      if (result) {
        await removeCVfromGroup(group, CVLink);
        updateGroups();
      } else {
        e.preventDefault();
      }
    } else { // deletar do banco
      result = window.confirm(
        `Confirma a remoção dos dados extraídos do CV de ${authorName}?\n\nUma vez confirmada, para visualizar os dados desde CV novamente, será necessário (re)abrir a página do CV no navegador.`
      );
  
      if (result) {
        await removerCVfromDB(CVLink);
        updateAuthors(CVLink);
      } else {
        e.preventDefault();
      }
    }
  }

  function handleLinkButton(e) {
    window.open(CVLink, '_blank');
  }

  // function handleExportCV() {
  //   exportCV(CVLink);
  // }

  function handleExportCVToCsv() {    // ← novo handler
  exportCVToCsv(CVLink);
}

  return (
    <Col lg="3" md="6">
      <div className="btn-icon-clipboard" style={{ flexDirection: 'row', display: 'flex', justifyContent: 'space-between' }}>
        <span>{authorName}</span>
        <div className="actions">
          <i className="fas fa-external-link-alt mr-1" onClick={handleLinkButton} style={{fontSize: "14px"}} title="Ir para a página do Lattes"/>
          {/* <i className="fas fa-file-csv mr-1" onClick={handleExportCV} style={{fontSize: "14px"}} title="Exportar curriculo"/> */}
          <i className="fas fa-file-csv mr-1" onClick={handleExportCVToCsv} style={{ fontSize: "14px" }} title="Exportar currículo (CSV para extensão)"/>
          <i className={group ? "fas fa-trash-can" : "fas fa-trash-can"} onClick={handleRemoveButton} style={{fontSize: "14px"}} title={group? "Remover curriculo do grupo" : "Remover dados do currículo da extensão"}/>
        </div>
      </div>
    </Col>
  );
};

export default CVItem;
