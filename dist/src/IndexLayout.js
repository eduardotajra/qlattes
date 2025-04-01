/*global chrome*/
import React, { useEffect, useState, useCallback } from "react";
import { useLocation, Route, Routes, Navigate } from "react-router-dom";
import Sidebar from "components/Sidebar.js";

import { getAreasData, getLattesData, getGroups, getArea } from "./utils";
import Index from "views/Index.js";
import GroupList from "views/GroupList.js";
import CVList from "views/CVList.js";
import Comments from "views/Comments";
import Questions from "views/Questions";
import OtherInfos from "views/OtherInfos";
import Credits from "views/Credits";

const IndexLayout = (props) => {
  const mainContent = React.useRef(null);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
    mainContent.current.scrollTop = 0;
  }, [location]);

  const [allQualisScores, setAllQualisScores] = useState([]);
  const [area, setArea] = useState({});
  const [authors, setAuthors] = useState([]);
  const [groups, setGroups] = useState({});
  const [authorsNameLink, setAuthorsNameLink] = useState([]);
  const [refresh, setRefresh] = useState(0); // Contador para forçar atualização

  // Função para buscar informações iniciais
  const getInfos = useCallback(async () => {
    setAllQualisScores(await getAreasData());
    setGroups(await getGroups());
    setArea(await getArea());
    const authorList = await getLattesData();
    setAuthors(authorList);
    setAuthorsNameLink(
      Object.entries(authorList).map(([link, author]) => ({
        link,
        name: author.name,
      }))
    );
  }, []);

  const updateGroups = async () => {
    setGroups(await getGroups());
  };

  const updateAuthors = async () => {
    const authorList = await getLattesData();
    setAuthors(authorList);
    setAuthorsNameLink(
      Object.entries(authorList).map(([link, author]) => ({
        link,
        name: author.name,
      }))
    );
    setRefresh((prev) => prev + 1); // Incrementa o contador para forçar reavaliação
  };

  const updateArea = async () => {
    setArea(await getArea());
  };

  // Listener para atualizar os autores quando o chrome.storage for alterado
  useEffect(() => {
    const storageListener = (changes, namespace) => {
      if (namespace === "local" && changes.authorsNameLink) {
        updateAuthors();
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, [updateAuthors]);

  const routes = [
    {
      path: "/index",
      component: (
        <Index
          authors={authors}
          allQualisScores={allQualisScores}
          groups={groups}
          authorsNameLink={authorsNameLink}
          previousArea={area}
          updateArea={updateArea}
          refresh={refresh} // Passa o contador (opcional, se desejar usar no filho)
        />
      ),
      layout: "/admin",
    },
    {
      path: "/cv-list",
      component: (
        <CVList
          authorsNameLink={authorsNameLink}
          allQualisScores={allQualisScores}
          updateAuthors={updateAuthors}
        />
      ),
      layout: "/admin",
    },
    {
      path: "/group-list",
      component: (
        <GroupList
          authors={authors}
          groups={groups}
          updateGroups={updateGroups}
          authorsNameLink={authorsNameLink}
          allQualisScores={allQualisScores}
        />
      ),
      layout: "/admin",
    },
    { path: "/questions", component: <Questions />, layout: "/admin" },
    { path: "/comments", component: <Comments />, layout: "/admin" },
    { path: "/other-infos", component: <OtherInfos />, layout: "/admin" },
    { path: "/credits", component: <Credits />, layout: "/admin" },
  ];

  useEffect(() => {
    getInfos();
  }, [getInfos]);

  return (
    <>
      <Sidebar
        {...props}
        routes={routes}
        logo={{
          innerLink: "/admin/index",
          imgSrc: require("./assets/img/qlattes-logo.png"),
          imgAlt: "Qlattes",
        }}
      />
      <div className="main-content" ref={mainContent}>
        <Routes>
          {routes.map((prop, key) => (
            <Route path={prop.path} element={prop.component} key={key} exact />
          ))}
          <Route path="*" element={<Navigate to="/admin/index" replace />} />
        </Routes>
      </div>
    </>
  );
};

export default IndexLayout;
