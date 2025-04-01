/*global chrome*/
import React, { useMemo } from "react";
import {
  Form,
  FormGroup,
  InputGroupAddon,
  InputGroupText,
  Input,
  InputGroup,
  Label,
  Container,
} from "reactstrap";
import Autocomplete from "@mui/material/Autocomplete";
import ListSubheader from "@mui/material/ListSubheader";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

import DataTable from "components/Data/DataTable";
import DataGraph from "components/Data/DataGraph";
import TopTable from "components/Data/TopTable";
import {
  addMissingYearsToPubInfo,
  getQualisStats,
  addMissingYearsToAuthorStats,
} from "../utils";

const Index = ({
  authors,
  groups,
  authorsNameLink,
  allQualisScores,
  previousArea,
  updateArea,
  refresh, // recebido do pai (opcional)
}) => {
  const [area, setArea] = React.useState(previousArea?.area);
  const [areaData, setAreaData] = React.useState(previousArea);
  const [viewType, setViewType] = React.useState("");
  const [showStatistics, setShowStatistics] = React.useState(false);
  const [showConsolidado, setShowConsolidado] = React.useState(false);
  const [showAgrupado, setShowAgrupado] = React.useState(false);
  const [showIndividual, setShowIndividual] = React.useState(false);
  const [showUnificado, setShowUnificado] = React.useState(false);



  const [initYear, setInitYear] = React.useState(0);
  const [endYear, setEndYear] = React.useState(0);
  const [initYearInput, setInitYearInput] = React.useState(0);
  const [endYearInput, setEndYearInput] = React.useState(0);

  const [qualisFilter, setQualisFilter] = React.useState(["A", "B"]);
  const [isUnifiedChart, setIsUnifiedChart] = React.useState(false);
  const [stats, setStats] = React.useState([]);
  const [individualStats, setIndividualStats] = React.useState([]);
  const [groupStats, setGroupStats] = React.useState([]);
  const [pubInfo, setPubInfo] = React.useState([]);
  const [individualPubInfo, setIndividualPubInfo] = React.useState([]);
  const [groupPubInfo, setGroupPubInfo] = React.useState([]);
  const [showAll, setShowAll] = React.useState(false);

  // useMemo para recalcular cvOptions sempre que authorsNameLink, groups ou refresh mudarem
  const [cvOptions, setCvOptions] = React.useState([]);

  React.useEffect(() => {
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
  }, [authorsNameLink, groups, refresh]);
  


  function handleViewTypeChange(value) {
    if (
      (value === "scoreTableView" || value === "scoreGraphicView") &&
      Object.keys(areaData).length === 0
    ) {
      alert(
        `Para visualizar a pontuação Qualis, é necessário selecionar uma Área do Conhecimento.`
      );
      return;
    }
    setViewType(value);
  }

  function handleViewTypeChange2(tipo, ativo = false, unificado = false) {
    if (!ativo) {
      setViewType("");
      return;
    }
  
    switch (tipo) {
      case "Consolidado":
        setViewType(unificado ? "qualisGraphicConsolidatedUnifiedView" : "qualisGraphicConsolidatedView");
        break;
      case "Agrupado":
        setViewType(unificado ? "qualisGraphicGroupUnifiedView" : "qualisGraphicGroupView");
        break;
      case "Individual":
        setViewType(unificado ? "qualisGraphicIndividualUnifiedView" : "qualisGraphicIndividualView");
        break;
      case "Unificado":
        // chamado apenas quando nenhum dos 3 está ativo
        setViewType("");
        break;
    }
  }
  

  const handleAreaChange = async (event) => {
    const prevArea = area;
    const newArea = event.target.value;
    if (newArea === "undefined") {
      await chrome.storage.local.set({
        area_data: {
          area: newArea,
          scores: {},
          label: "Sem Área do Conhecimento",
          source: {},
          base_year: "",
        },
      });
      updateArea();
      if (viewType === "scoreTableView" || viewType === "scoreGraphicView") {
        alert(
          `Para visualizar a pontuação Qualis, é necessário selecionar uma Área do Conhecimento.`
        );
        setViewType("");
      }
    } else {
      var match = allQualisScores.find((elem) =>
        Object.keys(elem.areas).includes(newArea)
      );
      if (match) {
        if (Object.keys(match.areas[newArea].scores).length > 0) {
          const currAreaData = {
            area: newArea,
            ...match.areas[newArea],
          };
          setAreaData(currAreaData);
          setArea(newArea);
          await chrome.storage.local.set({ area_data: currAreaData });
          updateArea();
        } else {
          alert(
            "Esta Área do Conhecimento não definiu pontuação específica para os estratos do Qualis."
          );
          if (prevArea !== "") {
            event.target.value = prevArea;
          } else {
            event.target.selectedIndex = 0;
          }
        }
      }
    }
  };

  function handleSelectedPeriod(value) {
    setEndYearInput(endYear);
    switch (value) {
      case "last5":
        setInitYearInput(endYear - 4);
        break;
      case "last10":
        setInitYearInput(endYear - 9);
        break;
      default:
        setInitYearInput(initYear);
        break;
    }
  }

  function handleCVsSelect(event, values) {
    console.log("Dados dos autores:", authors);
    console.log("Itens selecionados:", values);
    const selectedLinks = values
      .map((value) => (value.link ? value.link : value.authors))
      .flat()
      .filter((value, index, self) => self.indexOf(value) === index);
    if (selectedLinks.length === 0) {
      setShowAll(false);
      return;
    }
    console.log("Selected links:", selectedLinks);
    const allCvs = selectedLinks.map((link) => authors[link]);
    console.log("Dados de todos os CVs selecionados:", allCvs);
    const groupedCvs = {};
    values.forEach((value) => {
      if (value.link) {
        groupedCvs[value.name] = [authors[value.link]];
      } else {
        groupedCvs[value.name] = value.authors.map((author) => authors[author]);
      }
    });
    allCvs.forEach((cv, index) => {
      if (!cv) {
        console.error(`Autor não encontrado para o link: ${selectedLinks[index]}`);
        return;
      }
      if (!cv.pubInfo) {
        console.error(`Publicações não encontradas para o CV: ${selectedLinks[index]}`);
        return;
      }
    });
    console.log("Dados dos CVs e grupos selecionados:", groupedCvs);
    const allPubInfos = allCvs.map((cv) => cv.pubInfo).flat();
    console.log("Dados de publicação de todos os CVs integrados:", allPubInfos);
    const individualPubInfos = {};
    allCvs.forEach((cv) => {
      individualPubInfos[cv.name] = cv.pubInfo;
    });
    console.log("Dados de publicação de todos os CVs individuais:", individualPubInfos);
    const groupedPubInfos = {};
    Object.keys(groupedCvs).forEach((group) => {
      groupedPubInfos[group] = groupedCvs[group].map((cv) => cv.pubInfo).flat();
    });
    console.log("Dados de publicação dos CVs e grupos:", groupedPubInfos);

    // Processamento dos dados (merge, estatísticas, etc.)
    const mergedAllPubInfos = {};
    for (const pubInfo of allPubInfos) {
      for (const year in pubInfo) {
        if (!Array.isArray(mergedAllPubInfos[year])) {
          mergedAllPubInfos[year] = [];
        }
        mergedAllPubInfos[year] = mergedAllPubInfos[year].concat(pubInfo[year]);
      }
    }
    console.log(
      "Dados de publicação de todos os CVs integrados (combinados por ano):",
      mergedAllPubInfos
    );

    const mergedIndividualPubInfos = {};
    for (const name in individualPubInfos) {
      mergedIndividualPubInfos[name] = {};
      for (const year in individualPubInfos[name]) {
        if (!Array.isArray(mergedIndividualPubInfos[name][year])) {
          mergedIndividualPubInfos[name][year] = [];
        }
        mergedIndividualPubInfos[name][year] = mergedIndividualPubInfos[name][year].concat(
          individualPubInfos[name][year]
        );
      }
    }
    console.log(
      "Dados de publicação de todos os CVs individuais (combinados por ano):",
      mergedIndividualPubInfos
    );

    const mergedGroupedPubInfos = {};
    for (const group in groupedPubInfos) {
      mergedGroupedPubInfos[group] = {};
      for (const pubInfo of groupedPubInfos[group]) {
        for (const year in pubInfo) {
          if (!Array.isArray(mergedGroupedPubInfos[group][year])) {
            mergedGroupedPubInfos[group][year] = [];
          }
          mergedGroupedPubInfos[group][year] = mergedGroupedPubInfos[group][year].concat(
            pubInfo[year]
          );
        }
      }
    }
    console.log(
      "Dados de publicação dos CVs e grupos (combinados por ano):",
      mergedGroupedPubInfos
    );

    const years = Object.keys(mergedAllPubInfos);
    const scores = areaData ? areaData.scores : {};

    let allAuthorStats = {
      stats: [],
      minYear: years[0],
      maxYear: years[years.length - 1],
      totalPubs: NaN,
      pubInfo: [],
    };

    let individualAuthorStats = {};
    for (const name in individualPubInfos) {
      individualAuthorStats[name] = {
        stats: [],
        minYear: years[0],
        maxYear: years[years.length - 1],
        totalPubs: NaN,
        pubInfo: [],
      };
    }

    let groupedAuthorStats = {};
    for (const group in groupedPubInfos) {
      groupedAuthorStats[group] = {
        stats: [],
        minYear: years[0],
        maxYear: years[years.length - 1],
        totalPubs: NaN,
        pubInfo: [],
      };
    }

    const allPubInfoComplete = addMissingYearsToPubInfo(mergedAllPubInfos);
    allAuthorStats = addMissingYearsToAuthorStats(
      getQualisStats(allPubInfoComplete, "qualis", scores),
      allPubInfoComplete
    );
    console.log(
      "Dados de publicação de todos os autores integrados (completos):",
      allPubInfoComplete
    );

    const individualPubInfoComplete = {};
    for (const name in mergedIndividualPubInfos) {
      individualPubInfoComplete[name] = addMissingYearsToPubInfo(
        mergedIndividualPubInfos[name],
        years[0]
      );
      individualAuthorStats[name] = addMissingYearsToAuthorStats(
        getQualisStats(individualPubInfoComplete[name], "qualis", scores),
        individualPubInfoComplete[name],
        years[0]
      );
    }
    console.log(
      "Dados de publicação de todos os autores individuais (completos):",
      individualPubInfoComplete
    );

    const groupedPubInfoComplete = {};
    for (const group in mergedGroupedPubInfos) {
      groupedPubInfoComplete[group] = addMissingYearsToPubInfo(
        mergedGroupedPubInfos[group],
        years[0]
      );
      groupedAuthorStats[group] = addMissingYearsToAuthorStats(
        getQualisStats(groupedPubInfoComplete[group], "qualis", scores),
        groupedPubInfoComplete[group],
        years[0]
      );
    }
    console.log(
      "Dados de publicação de todos os grupos e autores (completos):",
      groupedPubInfoComplete
    );

    let totalPubs = 0;
    for (const key of Object.keys(allAuthorStats.stats)) {
      if (key !== "year" && key !== "jcr") {
        totalPubs += allAuthorStats.stats[key].reduce(
          (partialSum, a) => partialSum + a,
          0
        );
      }
    }
    allAuthorStats.totalPubs = totalPubs;
    for (const name in individualAuthorStats) {
      individualAuthorStats[name].totalPubs = totalPubs;
    }
    for (const group in groupedAuthorStats) {
      groupedAuthorStats[group].totalPubs = totalPubs;
    }

    const allStats = { __all: allAuthorStats.stats };

    const individualStats = {};
    for (const name in individualAuthorStats) {
      individualStats[name] = individualAuthorStats[name].stats;
    }

    const groupStats = {};
    for (const group in groupedAuthorStats) {
      groupStats[group] = groupedAuthorStats[group].stats;
    }

    console.log("Estatísticas de todos os autores integrados:", allStats);
    console.log("Estatísticas de todos os autores individuais:", individualStats);
    console.log("Estatísticas de todos os grupos e autores:", groupStats);

    setShowAll(true);
    setQualisFilter(["A", "B"]);
    setIsUnifiedChart(false);
    setStats(allStats);
    setIndividualStats(individualStats);
    setGroupStats(groupStats);
    setInitYearInput(years[0]);
    setEndYearInput(years[years.length - 1]);
    setInitYear(years[0]);
    setEndYear(years[years.length - 1]);
    setPubInfo(allPubInfoComplete);
    setIndividualPubInfo(individualPubInfoComplete);
    setGroupPubInfo(groupedPubInfoComplete);
  }

  if (previousArea?.area && !area) {
    setArea(previousArea.area);
    setAreaData(previousArea);
  }

  return (
    <>
      <Container fluid className="mt-3 mb-3" expand="md">
        <Form className="navbar-search navbar-search-dark form-inline mr-3 d-md-flex ml-lg-auto w-100">
          <FormGroup className="w-100" style={{ justifyContent: "space-between" }}>
            {/* Select authors / groups */}
            <InputGroup
              className="input-group-alternative"
              style={{
                width: "500px",
                border: "none",
                backgroundColor: "white",
              }}
            >
              <InputGroupAddon addonType="prepend">
                <InputGroupText>
                  <i className="fas fa-user" style={{ color: "#415e98" }} />
                </InputGroupText>
              </InputGroupAddon>
              <Autocomplete
                onChange={handleCVsSelect}
                multiple
                options={cvOptions}
                getOptionLabel={(option) => option.name}
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
                defaultValue={[]}
                filterSelectedOptions
                renderInput={(params) => (
                  <TextField {...params} placeholder="Selecione um CV" />
                )}
                noOptionsText="Não há CVs disponíveis"
                sx={{
                  width: "90%",
                  "& .MuiButtonBase-root": { color: "#415e98" },
                  "& .MuiInputBase-input": { color: "#415e98" },
                  "& fieldset": { border: "none" },
                  "& .MuiInputBase-root > .MuiButtonBase-root": {
                    border: "1px #415e98 solid",
                    backgroundColor: "transparent",
                    "& .MuiSvgIcon-root": { color: "#415e98" },
                  },
                }}
              />
            </InputGroup>
            {/* Label */}
            {showAll && (
              <Label style={{ marginLeft: "10px", marginRight: "10px", color: "#415e98" }}>
                {Object.values(pubInfo).flat().length} artigos em periódicos entre {initYear} e {endYear}
              </Label>
            )}
          </FormGroup>
          {showAll && (
            <>
              <FormGroup className="w-100">
                {/* área do conhecimento */}
                <InputGroup
                  className="input-group-alternative mt-3"
                  style={{
                    marginRight: "15px",
                    border: "none",
                    backgroundColor: "white",
                  }}
                >
                  <InputGroupAddon addonType="prepend">
                    <InputGroupText>
                      <i className="fas fa-graduation-cap" style={{ color: "#415e98" }} />
                    </InputGroupText>
                  </InputGroupAddon>
                  <Input
                    id="exampleSelect"
                    name="select"
                    type="select"
                    className="input-group-alternative"
                    style={{ marginRight: "15px", color: "#415e98" }}
                    value={area}
                    onChange={(e) => handleAreaChange(e)}
                    defaultValue={area}
                  >
                    <option value="" disabled={true} hidden={true}>
                      Selecione uma Área do Conhecimento
                    </option>
                    <option value="undefined" hidden={true}>
                      Sem Área do Conhecimento
                    </option>
                    {allQualisScores.map((greatArea) => (
                      <optgroup label={greatArea.label} style={{ color: "black" }}>
                        {Object.keys(greatArea.areas).map((a) => (
                          <option key={a} value={a}>
                            {greatArea.areas[a].label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Input>
                </InputGroup>
                {/* View type */}
                <InputGroup
                  className="input-group-alternative mt-3"
                  style={{
                    marginRight: "15px",
                    border: "none",
                    backgroundColor: "white",
                  }}
                >
                  <InputGroupAddon addonType="prepend">
                    <InputGroupText>
                      <i className="fas fa-chart-bar" style={{ color: "#415e98" }} />
                    </InputGroupText>
                  </InputGroupAddon>
                  <Input
                    id="exampleSelect"
                    name="select"
                    type="select"
                    className="input-group-alternative"
                    style={{ marginRight: "15px", color: "#415e98" }}
                    value={viewType}
                    onChange={(e) => handleViewTypeChange(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled={true} hidden={true}>
                      Selecione uma visualização
                    </option>
                    <optgroup label="Classificação" style={{ color: "black" }}>
                      <option value="qualisTableView">
                        Tabela de classificação Qualis
                      </option>
                      <option value="qualisGraphicConsolidatedView">
                        Gráfico de classificação Qualis (consolidado)
                      </option>
                      <option value="qualisGraphicConsolidatedUnifiedView">
                        Gráfico de classificação Qualis (consolidado unificado)
                      </option>
                      <option value="qualisGraphicGroupView">
                        Gráfico de classificação Qualis (agrupado)
                      </option>
                      <option value="qualisGraphicGroupUnifiedView">
                        Gráfico de classificação Qualis (agrupado unificado)
                      </option>
                      <option value="qualisGraphicIndividualView">
                        Gráfico de classificação Qualis (individual)
                      </option>
                      <option value="qualisGraphicIndividualUnifiedView">
                        Gráfico de classificação Qualis (individual unificado)
                      </option>
                      <option value="qualisGraphicParetoCVView">
                        Gráfico de percentual de produção Qualis (por CV)
                      </option>
                    </optgroup>
                    <optgroup label="Pontuação" style={{ color: "black" }}>
                      <option disabled={!(areaData && areaData.scores)} value="scoreTableView">
                        Tabela de pontuação Qualis
                      </option>
                      <option disabled={!(areaData && areaData.scores)} value="scoreGraphicView">
                        Gráfico de pontuação Qualis
                      </option>
                    </optgroup>
                    <optgroup label="Publicações" style={{ color: "black" }}>
                      <option value="top5View">5 melhores artigos</option>
                      <option value="top10View">10 melhores artigos</option>
                    </optgroup>
                  </Input>
                </InputGroup>
                {/* Init year */}
                <InputGroup
                  className="input-group-alternative mt-3"
                  style={{
                    width: "100px",
                    border: "none",
                    backgroundColor: "white",
                  }}
                >
                  <Input
                    id="exampleEmail"
                    name="initYear"
                    placeholder="Ano de inicio"
                    type="number"
                    min={initYear}
                    max={endYearInput}
                    value={initYearInput}
                    required="required"
                    onChange={(e) => setInitYearInput(e.target.value)}
                    style={{ color: "#415e98" }}
                  />
                </InputGroup>
                <Label
                  className="mt-3"
                  style={{
                    marginLeft: "10px",
                    marginRight: "10px",
                    color: "#415e98",
                  }}
                >
                  a
                </Label>
                {/* End year */}
                <InputGroup
                  className="input-group-alternative mt-3"
                  style={{
                    width: "100px",
                    border: "none",
                    backgroundColor: "white",
                    marginRight: "10px",
                  }}
                >
                  <Input
                    style={{ color: "#415e98" }}
                    id="exampleEmail"
                    name="endYear"
                    placeholder="Ano de fim"
                    type="number"
                    min={initYearInput}
                    max={endYear}
                    value={endYearInput}
                    required="required"
                    onChange={(e) => setEndYearInput(e.target.value)}
                  />
                </InputGroup>
                {/* Period */}
                <InputGroup
                  className="input-group-alternative mt-3"
                  style={{ border: "none", backgroundColor: "white" }}
                >
                  <InputGroupAddon addonType="prepend">
                    <InputGroupText>
                      <i className="fas fa-calendar-check" style={{ color: "#415e98" }} />
                    </InputGroupText>
                  </InputGroupAddon>
                  <Input
                    id="exampleSelect"
                    name="select"
                    type="select"
                    className="input-group-alternative"
                    style={{ marginRight: "15px", color: "#415e98" }}
                    onChange={(e) => handleSelectedPeriod(e.target.value)}
                    defaultValue="all"
                  >
                    <option value="last5" style={{ color: "black" }}>
                      Últimos 5 anos
                    </option>
                    <option value="last10" style={{ color: "black" }}>
                      Últimos 10 anos
                    </option>
                    <option value="all" style={{ color: "black" }}>
                      Todo o período do CV
                    </option>
                  </Input>
                </InputGroup>
                {/* Statistics */}
                <InputGroupText
                  className="mt-3 ml-4"
                  style={{ backgroundColor: "transparent", border: "none" }}
                >
                  <Input
                    addon
                    aria-label="Checkbox for following text input"
                    type="checkbox"
                    value={showStatistics}
                    onChange={(e) => setShowStatistics(!showStatistics)}
                  />
                  <Label style={{ color: "#415e98"}} className="ml-2 mr-3">
                    Exibir estatísticas
                  </Label>
                  <Input
                    type="checkbox"
                    checked={showConsolidado}
                    onChange={() => {
                      const novoValor = !showConsolidado;
                      setShowConsolidado(novoValor);
                      setShowAgrupado(false);
                      setShowIndividual(false);
                      handleViewTypeChange2("Consolidado", novoValor, showUnificado);
                    }}
                  />
                  <Label style={{ color: "#415e98" }} className="ml-2 mr-3">
                    Consolidado
                  </Label>

                  <Input
                    type="checkbox"
                    checked={showAgrupado}
                    onChange={() => {
                      const novoValor = !showAgrupado;
                      setShowAgrupado(novoValor);
                      setShowConsolidado(false);
                      setShowIndividual(false);
                      handleViewTypeChange2("Agrupado", novoValor, showUnificado);
                    }}
                  />
                  <Label style={{ color: "#415e98" }} className="ml-2 mr-3">
                    Agrupado
                  </Label>

                  <Input
                    type="checkbox"
                    checked={showIndividual}
                    onChange={() => {
                      const novoValor = !showIndividual;
                      setShowIndividual(novoValor);
                      setShowConsolidado(false);
                      setShowAgrupado(false);
                      handleViewTypeChange2("Individual", novoValor, showUnificado);
                    }}
                  />
                  <Label style={{ color: "#415e98" }} className="ml-2 mr-3">
                    Individual
                  </Label>

                  <Input
                    type="checkbox"
                    checked={showUnificado}
                    onChange={() => {
                      const novoValor = !showUnificado;
                      setShowUnificado(novoValor);
                      // Repassa o ativo atual (entre Consolidado, Agrupado ou Individual)
                      if (showConsolidado) handleViewTypeChange2("Consolidado", true, novoValor);
                      else if (showAgrupado) handleViewTypeChange2("Agrupado", true, novoValor);
                      else if (showIndividual) handleViewTypeChange2("Individual", true, novoValor);
                      else handleViewTypeChange2("Unificado", false, novoValor); // Nenhum marcado
                    }}
                  />
                  <Label style={{ color: "#415e98" }} className="ml-2 mr-3">
                    Unificado
                  </Label>

                </InputGroupText>
              </FormGroup>
            </>
          )}
        </Form>
      </Container>
      <Container className="mb-5" fluid>
        {showAll && (
          <>
            {viewType === "qualisTableView" && (
              <DataTable
                tableName="Tabela de classificação Qualis"
                init={initYearInput}
                end={endYearInput}
                stats={stats}
                showStatistics={showStatistics}
              />
            )}
            {viewType === "qualisGraphicConsolidatedView" && (
              <DataGraph
                graphName="Gráfico de classificação Qualis (consolidado)"
                init={initYearInput}
                end={endYearInput}
                stats={stats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
              />
            )}
            {viewType === "qualisGraphicConsolidatedUnifiedView" && (
              <DataGraph
                graphName="Gráfico de classificação Qualis (consolidado unificado)"
                init={initYearInput}
                end={endYearInput}
                stats={stats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
                isUnifiedChart={true}
              />
            )}
            {viewType === "qualisGraphicGroupView" && (
              <DataGraph
                graphName="Gráfico de classificação Qualis (agrupado)"
                init={initYearInput}
                end={endYearInput}
                stats={groupStats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
              />
            )}
            {viewType === "qualisGraphicGroupUnifiedView" && (
              <DataGraph
                graphName="Gráfico de classificação Qualis (agrupado unificado)"
                init={initYearInput}
                end={endYearInput}
                stats={groupStats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
                isUnifiedChart={true}
              />
            )}
            {viewType === "qualisGraphicIndividualView" && (
              <DataGraph
                graphName="Gráfico de classificação Qualis (individual)"
                init={initYearInput}
                end={endYearInput}
                stats={individualStats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
              />
            )}
            {viewType === "qualisGraphicIndividualUnifiedView" && (
              <DataGraph
                graphName="Gráfico de classificação Qualis (individual unificado)"
                init={initYearInput}
                end={endYearInput}
                stats={individualStats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
                isUnifiedChart={true}
              />
            )}
            {viewType === "qualisGraphicParetoCVView" && (
              <DataGraph
                graphName="Gráfico de percentual de produção Qualis (por CV)"
                init={initYearInput}
                end={endYearInput}
                stats={individualStats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
                isUnifiedChart={true}
                isParetoChart={true}
              />
            )}
            {viewType === "scoreTableView" && (
              <DataTable
                tableName="Tabela de pontuação Qualis"
                init={initYearInput}
                end={endYearInput}
                stats={stats}
                showStatistics={showStatistics}
                areaData={areaData}
              />
            )}
            {viewType === "scoreGraphicView" && (
              <DataGraph
                graphName="Gráfico de pontuação Qualis"
                init={initYearInput}
                end={endYearInput}
                stats={stats}
                statsFilter={qualisFilter}
                showStatistics={showStatistics}
                areaData={areaData}
              />
            )}
            {viewType === "top5View" && (
              <TopTable
                tableName="5 melhores publicações"
                topN={5}
                init={initYearInput}
                end={endYearInput}
                pubInfo={pubInfo}
              />
            )}
            {viewType === "top10View" && (
              <TopTable
                tableName="10 melhores publicações"
                topN={10}
                init={initYearInput}
                end={endYearInput}
                pubInfo={pubInfo}
              />
            )}
          </>
        )}
        {areaData?.scores && viewType.includes("score") && (
          <div className="mt-1">
            Fonte da pontuação:{" "}
            <a
              href={areaData.source.url}
              target="_blank"
              rel="noreferrer"
              title={`Visualizar ${areaData.source.label}`}
            >
              {areaData.source.label}
            </a>{" "}
            da {areaData.label} (ano-base: {areaData.base_year})
          </div>
        )}
      </Container>
    </>
  );
};

export default Index;
