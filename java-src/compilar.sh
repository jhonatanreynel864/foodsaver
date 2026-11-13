#!/bin/sh
# Compila el código Java de FoodSaver y genera java/foodsaver.jar
# Uso:   sh java-src/compilar.sh           (compila)
#        sh java-src/compilar.sh pruebas   (compila y ejecuta las pruebas)
#        sh java-src/compilar.sh consola   (compila y abre el menú de consola)
set -e
cd "$(dirname "$0")/.."
unset JAVA_TOOL_OPTIONS
rm -rf java-src/clases
mkdir -p java-src/clases java
# --release 8: el motor Java del navegador (CheerpJ) trabaja con bytecode de Java 8
javac -nowarn -Xlint:-options -encoding UTF-8 --release 8 -d java-src/clases java-src/foodsaver/*.java
jar cfe java/foodsaver.jar foodsaver.MenuConsola -C java-src/clases .
echo "Listo: java/foodsaver.jar"
if [ "$1" = "pruebas" ]; then
  mkdir -p java-src/clases-pruebas
  javac -encoding UTF-8 -cp java/foodsaver.jar -d java-src/clases-pruebas java-src/pruebas/Pruebas.java
  java -cp java/foodsaver.jar:java-src/clases-pruebas Pruebas
  rm -rf java-src/clases-pruebas
fi
rm -rf java-src/clases
if [ "$1" = "consola" ]; then
  java -cp java/foodsaver.jar foodsaver.MenuConsola
fi
