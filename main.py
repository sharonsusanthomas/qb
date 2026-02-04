import streamlit as st

from app.app import get_app


def initial_config():
    """
    Initial configuration of OpenAI API and streamlit
    """
    st.set_page_config(
        page_title="Exam generator",
        page_icon=":pencil2:",
    )


def main():
    initial_config()

    app = get_app()
    app.render()


if __name__ == "__main__":
    main()
