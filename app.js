const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

function getDirectories(srcPath) {
    return fs.readdirSync(srcPath).filter(file => fs.statSync(path.join(srcPath, file)).isDirectory());
}

app.get('/', (req, res) => {
    const currentDir = path.join(__dirname, 'static-pages');
    const templatePath = path.join(__dirname, 'templates', 'main.html');

    fs.readFile(templatePath, 'utf-8', (err, template) => {
        if (err) {
            return res.status(500).send('无法读取模板文件');
        }

        const directories = getDirectories(currentDir);

        let fileListHtml = '<ul>';
        directories.forEach(dir => {
            const filePath = path.join(currentDir, dir, 'index.html');
            if (fs.existsSync(filePath)) {
                let displayText = dir;  // 默认显示文件夹名称
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const titleMatch = fileContent.match(/<title>(.*?)<\/title>/);

                if (titleMatch && titleMatch[1].trim() !== '') {
                    displayText = titleMatch[1];
                }
                fileListHtml += `<li><a href="/${dir}">${displayText}</a></li>`;
            }
        });
        fileListHtml += '</ul>';

        // 将生成的文件夹列表插入到模板中的<div id="file-list">中
        const html = template.replace('<div id="file-list"></div>', `<div id="file-list">${fileListHtml}</div>`);
        res.send(html);
    });
});

// 处理静态文件请求，并在返回前注入JavaScript
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'static-pages')));
app.use('/:folder', (req, res, next) => {
    const folderPath = path.join(__dirname, 'static-pages', req.params.folder);
    const indexPath = path.join(folderPath, 'index.html');

    if (fs.existsSync(indexPath)) {
        fs.readFile(indexPath, 'utf-8', (err, data) => {
            if (err) {
                return res.status(500).send('无法读取文件');
            }

            // 在文件末尾注入JavaScript
            const injectedData = data.replace('</body>', '<script src="/assets/js/toolbar.js"></script></body>');
            res.send(injectedData);
        });
    } else {
        next();
    }
});

// 处理错误情况并使用错误模板
app.use((req, res) => {
    const errorTemplatePath = path.join(__dirname, 'templates', 'error.html');
    fs.readFile(errorTemplatePath, 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).send('无法读取错误模板文件');
        }
        const errorHtml = data.replace(
            '<div id="error-details"></div>',
            `<div id="error-details"><p>错误代码: 404</p><p>错误信息: 页面未找到</p></div>`
        );
        res.status(404).send(errorHtml);
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
