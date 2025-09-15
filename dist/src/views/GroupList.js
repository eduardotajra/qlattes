/*global chrome*/
import {
  Container,
  Row,
  Form,
  FormGroup,
  InputGroupAddon,
  InputGroupText,
  Input,
  InputGroup,
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Card,
  CardHeader,
  CardBody,
} from "reactstrap";
import GroupItem from "components/GroupItem";
import React, { useState, useMemo, useEffect, useRef } from "react";

import Papa from 'papaparse';

import Autocomplete from '@mui/material/Autocomplete';
import ListSubheader from "@mui/material/ListSubheader";
import TextField from '@mui/material/TextField';
import Box from "@mui/material/Box";

import {
  importGroupFromCsv,
  getLattesData,
  addNewGroup,
  getGroups,
  importCVFromCsv
} from "../utils";

const GroupList = ({
  authors,
  groups,
  updateGroups,
  authorsNameLink,
  allQualisScores
}) => {
  const fileInputRef = useRef(null);

  const [modal, setModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAuthors, setNewGroupAuthors] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  const [localGroups, setLocalGroups] = useState({});
  const [localAuthors, setLocalAuthors] = useState({});
  
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [importCvMap, setImportCvMap] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importGroupName, setImportGroupName] = useState("");

  const initialLattesRef = useRef(null);
  const initialGroupsRef = useRef(null);

  const [cvOptions, setCvOptions] = useState([]);
  
    useEffect(() => {
      const authorsNameLinkWithGroup = authorsNameLink.map((author) => ({
        ...author,
        groupType: "Autores",
      }));
      const groupsWithGroup = Object.values(groups).map((grp) => ({
        ...grp,
        groupType: "Grupos",
      }));
      const combined = [...authorsNameLinkWithGroup, ...groupsWithGroup];
      setCvOptions(combined);
    }, [authorsNameLink, groups]);

  // Atualiza localGroups quando groups muda
  useEffect(() => {
    if (groups && Object.keys(groups).length > 0) {
      setLocalGroups(groups);
    } else {
      setLocalGroups({}); // zera corretamente quando não há grupos
    }
  }, [groups]);


  // Atualiza localAuthors quando authors muda
  useEffect(() => {
    if (authors && Object.keys(authors).length > 0) {
      setLocalAuthors(authors);
    }
  }, [authors]);

  
  const handleSaveEdit = async () => {
    if (!editingGroupName.trim()) {
      alert("O nome do grupo não pode ser vazio.");
      return;
    }    
    const groupsData = await chrome.storage.local.get("groupData");
    const groupData = groupsData.groupData;
  
    const nameAlreadyExists = Object.entries(groupData).some(
      ([id, g]) =>
        id !== editingGroupId &&
        g.name.trim().toLowerCase() === editingGroupName.trim().toLowerCase()
    );
  
    if (nameAlreadyExists) {
      alert("Já existe um grupo com esse nome!");
      return;
    }
  
    groupData[editingGroupId].name = editingGroupName;
    await chrome.storage.local.set({ groupData });
    setEditModalOpen(false);
    updateGroups();
  };
  

  const authorOptions = useMemo(() => {
    if (!localAuthors || Object.keys(localAuthors).length === 0) return [];
    return Object.entries(localAuthors).map(([link, info]) => ({
      link,
      name: info.name,
    }));
  }, [localAuthors]);

  const toggle = () => setModal(!modal);

  const handleNewButton = async () => {
    const { groupData = {} } = await chrome.storage.local.get('groupData');
    const nomesGrupos = Object.values(groupData).map(g => (g?.name ?? '').trim()).filter(Boolean);

    const nomeJaExiste = nomesGrupos.some(
      nome => nome.toLowerCase() === newGroupName.toLowerCase()
    );

    if (!newGroupName.trim()) {
      alert("O nome do grupo não pode ser vazio.");
      return;
    }
    
    if (nomeJaExiste) {
      alert("Já existe um grupo com esse nome!");
      return;
    }
    
    

    await addNewGroup(newGroupName, newGroupAuthors);
    toggle();
    setNewGroupAuthors([]);
    setNewGroupName("");
    updateGroups();
  };

  const handleCancelButton = () => {
    setNewGroupAuthors([]);
    setNewGroupName("");
    toggle();
  }

  const searchGroupOrAuthor = (event, value) => {
    setSelectedOption(value);
  }

  const handleImportGroupFile = (e) => {
    const file = e.target.files[0];
    if (!file) {
      fileInputRef.current.value = '';
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data, errors }) => {
        // 0) Validações básicas
        if (errors.length) {
          alert("Erro ao ler CSV: verifique o formato.");
          fileInputRef.current.value = '';
          return;
        }
        const required = ["nome","link","ano","titulo","periodico","issn","qualis","jcr","baseYear"];
        const missing = required.filter(col => !data[0].hasOwnProperty(col));
        if (missing.length) {
          alert(`CSV inválido. Faltando: ${missing.join(", ")}`);
          fileInputRef.current.value = '';
          return;
        }

        // 1) Snapshot para rollback
        initialLattesRef.current = await getLattesData();
        initialGroupsRef.current = await getGroups();

        // 2) Monta cvMap de pubInfo
        const cvMap = {};
        data.forEach(row => {
          if (!cvMap[row.link]) {
            cvMap[row.link] = { nome: row.nome, pubInfo: {} };
          }
          const info = cvMap[row.link];
          if (!info.pubInfo[row.ano]) info.pubInfo[row.ano] = [];
          info.pubInfo[row.ano].push({
            issn: row.issn,
            title: row.titulo,
            pubName: row.periodico,
            qualis: row.qualis,
            jcr: row.jcr,
            baseYear: row.baseYear,
          });
        });

        // 3) Prompt único para nome do grupo
        let groupName = window.prompt("Digite o NOME do grupo para importação:");
        if (!groupName) {
          await chrome.storage.local.set({ lattes_data: initialLattesRef.current });
          await chrome.storage.local.set({ groupData: initialGroupsRef.current });
          setImportCvMap(null);
          setImportGroupName("");
          fileInputRef.current.value = '';
          return;
        }
        groupName = groupName.trim();

        // 4) Verifica existência e abre modal ou cria direto
        const allGroups = await getGroups();
        const exists     = Object.values(allGroups)
          .some(g => g.name.trim().toLowerCase() === groupName.toLowerCase());

        if (exists) {
          setImportCvMap({ cvMap, groupName });
          setImportGroupName(groupName);
          setImportModalOpen(true);
        } else {
          await importGroupFromCsv(groupName, Object.keys(cvMap));
          updateGroups();
          alert(`Grupo "${groupName}" criado com sucesso!`);
          setImportCvMap(null);
          setImportGroupName("");
          fileInputRef.current.value = '';
        }
      }
    });
  };



  const handleImportGroupChoice = async (mode) => {
    const { cvMap, groupName } = importCvMap;
    setImportModalOpen(false);

    // Função de rollback unificada
    const rollback = async () => {
      await chrome.storage.local.set({ lattes_data: initialLattesRef.current });
      await chrome.storage.local.set({ groupData:    initialGroupsRef.current });
    };

    // 1) Se cancelou, reverte e sai
    if (mode === 'cancel') {
      await rollback();
      setImportCvMap(null);
      setImportGroupName("");
      fileInputRef.current.value = "";
      return;
    }

    try {
      // 2) Importa/atualiza CVs conforme modo
      const allData = await getLattesData();
      for (const [link, { nome, pubInfo }] of Object.entries(cvMap)) {
        if (!allData[link]) {
          // sempre adiciona novos CVs
          await importCVFromCsv(link, nome, pubInfo);
        } else if (mode === 'overwriteAll') {
          // sobrescreve todos os existentes
          await importCVFromCsv(link, nome, pubInfo);
        }
        // modo 'addMissing' deixa os existentes intactos
      }

      // 3) Calcula o nome final do grupo
      let finalName = groupName;
      if (mode === 'rename') {
        let newName = null;
        do {
          newName = window.prompt("Digite o NOVO nome do grupo:");
          if (!newName) throw new Error("user-cancel");
          newName = newName.trim();
        } while (
          Object.values(await getGroups())
            .some(g => g.name.trim().toLowerCase() === newName.toLowerCase())
        );
        finalName = newName;
      }

      // 4) Cria ou atualiza o grupo conforme modo
      let finalAuthors;
      if (mode === 'overwriteAll' || mode === 'rename') {
        // substitui todos pelos links do CSV
        finalAuthors = Object.keys(cvMap);
      } else if (mode === 'addMissing') {
        // mescla existentes + novos
        const existingGroups = await getGroups();
        const entry = Object.entries(existingGroups)
          .find(([, g]) => g.name.trim().toLowerCase() === groupName.toLowerCase());
        const base = entry ? entry[1].authors : [];
        finalAuthors = Array.from(new Set([...base, ...Object.keys(cvMap)]));
      }

      await importGroupFromCsv(finalName, finalAuthors);

      updateGroups();
      alert("Importação concluída com sucesso!");
      setImportCvMap(null);
      setImportGroupName("");
      fileInputRef.current.value = '';
    } catch (err) {
      // rollback em qualquer erro ou user-cancel
      await rollback();
      setImportCvMap(null);
      setImportGroupName("");
      fileInputRef.current.value = '';
      if (err.message !== "user-cancel") {
        console.error(err);
        alert("Ocorreu um erro. Tudo foi revertido.");
      }
    }
  };




  return (
    <>
      <Container fluid className="mt-3 mb-2" expand="md">
        <Form className="navbar-search navbar-search-dark form-inline mr-3 d-md-flex">
          <FormGroup className="w-100" style={{ justifyContent: 'space-between' }}>
            <InputGroup className="input-group-alternative" style={{ width:"56.6em", border: 'none', backgroundColor: 'white' }}>
              <InputGroupAddon addonType="prepend">
                <InputGroupText style={{paddingLeft: '18px'}}>
                  <i className="fas fa-search" style={{ color: '#415e98' }}/>
                </InputGroupText>
              </InputGroupAddon>
              <Autocomplete
                onChange={searchGroupOrAuthor}
                options={cvOptions}
                getOptionLabel={(option) => option.name}
                filterSelectedOptions
                noOptionsText="Não há CVs ou grupos disponíveis"
                ListboxProps={{
                  sx: {
                    paddingTop: 0,
                  }
                }}
                groupBy={(option) => option.groupType}
                renderGroup={(params) => {
                  const { group, children, key } = params;
                  return (
                    <React.Fragment key={key}>
                      <ListSubheader
                        component="div"
                        sx={{
                          backgroundColor: "#fff",
                          fontWeight: "bold",
                          color: "#000",
                        }}
                      >
                        {group}
                      </ListSubheader>
                      <Box sx={{ ml: 2 }}>{children}</Box>
                    </React.Fragment>
                  );
                }}
                renderOption={(props, option) => (
                  <li {...props}>
                    {option.groupType === "Autores" && (
                      <i className="fas fa-user" style={{ marginRight: "8px", color: "#415e98" }}></i>
                    )}
                    {option.groupType === "Grupos" && (
                      <i className="fa-solid fa-users" style={{ marginRight: "8px", color: "#415e98" }}></i>
                    )}
                    {option.name}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Pesquise por um CV ou grupo"
                  />
                )}
                sx={{
                  flex:1,
                  position: "relative",
                  // 1) Espaço extra à direita para não sobrepor o texto
                  "& .MuiAutocomplete-inputRoot": {
                    paddingRight: "2.5rem",
                  },
                  // 2) Container que engloba os ícones (clear + dropdown)
                  "& .MuiAutocomplete-endAdornment": {
                    position: "absolute",
                    top: "50%",
                    transform: "translateY(-50%)",
                  },
                  "& .MuiOutlinedInput-root .MuiAutocomplete-endAdornment": {
                    marginRight: "1em",               // agora fica mais específico
                    right: 0
                  },
                  // 3) Ícone de limpar (X) posicionado antes da setinha
                  "& .MuiAutocomplete-clearIndicator": {
                    marginRight: "0.5rem",
                    padding: 0,
                  },
                  // 4) Ícone de dropdown colado à borda
                  "& .MuiAutocomplete-popupIndicator": {
                    padding: 0,
                  },
                  '& .MuiButtonBase-root': {
                      color: '#415e98'
                  },
                  '& .MuiInputBase-input': {
                      color: '#415e98',
                  },
                  '& fieldset': {
                    border: "none",
                  }
                }}
              />
            </InputGroup>
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start'}}>
              <Button
                color="white"
                onClick={toggle}
                size="sm"
                style={{
                  width: '160px',
                  color: '#415e98'
                }}
              >
                Criar novo grupo
              </Button>
              <Button style={{width: '160px', color: '#415e98', marginLeft: 0}} color="white" size="sm" onClick={() => {fileInputRef.current.value = ""; fileInputRef.current.click()}}>
                Importar Grupo
              </Button>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleImportGroupFile}
              />
            </div>
          </FormGroup>
        </Form>
      </Container>
      {/* Page content */}
      <Container className="mb-5" fluid>
        <Row>
          <div className="col">
            <Card className="shadow mt-3">
              <CardHeader className="bg-transparent" style={{ flexDirection: 'row', display: 'flex', justifyContent: "space-between", alignItems: 'center'}}>
                <h3 className="mb-0">Grupos Criados</h3>
              </CardHeader>
              <CardBody style={{paddingTop:'8px'}}>
                <Row>
                  <div className="col">
                    {Object.entries(localGroups).map(group => {
                      if (selectedOption?.authors && group[1].name !== selectedOption.name) return null;

                      let groupAuthors = group[1].authors
                        .filter(link => localAuthors[link])
                        .map(link => ({ link, name: localAuthors[link].name }));

                      if (selectedOption?.link) {
                        groupAuthors = groupAuthors.filter(item => item.link === selectedOption.link);
                        if(groupAuthors.length === 0) return null;
                      }

                      return <GroupItem
                        key={group[0]}
                        groupId={group[0]}
                        groupName={group[1].name}
                        allAuthors={Object.entries(localAuthors)
                          .filter(author => !group[1].authors.includes(author[0]))
                          .map(([link, author]) => ({link, name: author.name}))}
                        authors={groupAuthors}
                        updateGroups={updateGroups}
                        allQualisScores={allQualisScores}
                        onEditGroupName={(groupId, currentName) => {
                          setEditingGroupId(groupId);
                          setEditingGroupName(currentName);
                          setEditModalOpen(true);
                        }}
                      />
                    })}
                  </div>
                </Row>
              </CardBody>
            </Card>
          </div>
        </Row>
      </Container>
      
      <Modal isOpen={importModalOpen} toggle={() => setImportModalOpen(false)}>
        <ModalHeader toggle={() => setImportModalOpen(false)}>
          Importar Grupo "{importGroupName}"
        </ModalHeader>
        <ModalBody>
          <Input
            placeholder="Escolha como tratar este grupo"
            type="text"
            readOnly
            value={`Grupo: ${importGroupName}`}
            style={{ marginBottom: '1rem' }}
          />

          <Button
            color="primary"
            block
            onClick={() => handleImportGroupChoice('overwriteAll')}
            style={{ marginBottom: '0.5rem' }}
          >
            Sobrescrever todos os membros
          </Button>
          <Button
            color="primary"
            block
            onClick={() => handleImportGroupChoice('addMissing')}
            style={{ marginBottom: '0.5rem' }}
          >
            Adicionar apenas membros faltantes
          </Button>
          <Button
            color="primary"
            block
            onClick={() => handleImportGroupChoice('rename')}
            style={{ marginBottom: '0.5rem' }}
          >
            Escolher outro nome
          </Button>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => handleImportGroupChoice('cancel')}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>

      {/* New group Modal */}
      <Modal isOpen={modal} toggle={toggle}>
        <ModalHeader toggle={toggle}>Adicionar um novo Grupo</ModalHeader>
        <ModalBody>
          <Input
            placeholder="Nome do grupo"
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />

          <Autocomplete
            multiple
            options={authorOptions}
            value={authorOptions.filter(option => newGroupAuthors.includes(option.link))}
            onChange={(event, newValue) => setNewGroupAuthors(newValue.map(v => v.link))}
            getOptionLabel={(option) => option.name}
            filterSelectedOptions
            noOptionsText="Não há CVs disponíveis"
            renderInput={(params) => (
              <TextField {...params} placeholder="Selecione um CV" />
            )}
            sx={{
              width: "90%",
              "& .MuiButtonBase-root": { color: "#415e98" },
              "& .MuiInputBase-input": { color: "#415e98" },
              "fieldset": { border: "none" },
              "& .MuiInputBase-root > .MuiButtonBase-root": {
                border: "1px #415e98 solid",
                backgroundColor: "transparent",
                "& .MuiSvgIcon-root": { color: "#415e98" }
              }
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={handleNewButton}>
            Salvar
          </Button>{' '}
          <Button color="secondary" onClick={handleCancelButton}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>
      <Modal isOpen={editModalOpen} toggle={() => setEditModalOpen(!editModalOpen)}>
        <ModalHeader>Editar nome do grupo</ModalHeader>
        <ModalBody>
          <Input
            placeholder="Novo nome do grupo"
            type="text"
            value={editingGroupName}
            onChange={(e) => setEditingGroupName(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={handleSaveEdit}>Salvar</Button>
          <Button color="secondary" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default GroupList;